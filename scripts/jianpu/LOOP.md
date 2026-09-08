# Boucle — reconnaissance des accords 简谱

État persistant de la boucle d'ajustement. **Ce fichier est l'artefact
principal** : il porte le protocole, les métriques et le journal. L'autre
artefact est `classifier.json` (paramètres de classification des rangées).

Le `templates/` prévu au départ — une bibliothèque de bitmaps d'étiquettes
constituée à la main — n'existe pas et n'existera pas : les gabarits sont
rendus à la volée depuis le vocabulaire du `.cho` (itération 5).

## Objectif

Redessiner les accords transposés par-dessus les partitions image. Les
chiffres restent des pixels (justes par construction, invariants par
transposition) ; seuls les accords sont remplacés.

## Pourquoi une boucle

Ce qui itère n'est pas le modèle mais **les artefacts** : les paramètres du
classifieur et la vérité terrain. Ils persistent sur le disque et
grossissent à chaque tour. L'oracle est mécanique, donc le progrès est
mesurable sans appréciation.

**Où vit la précision.** Jusqu'à l'itération 4 elle vivait dans le
classifieur, qui refusait toute rangée douteuse. Depuis que `match.py` lit
les étiquettes, elle vit dans le matcher : une rangée qui n'est pas des
accords produit des amas que rien n'apparie. Le classifieur peut donc être
permissif — **il propose, le matcher dispose** (itération 7).

## Oracle (double, mécanique)

1. **Couverture** — toute rangée classée « accords » produit des étiquettes
   toutes appariées à la bibliothèque, au-dessus du seuil de corrélation.
2. **Validité** — tout accord lu appartient au vocabulaire du `.cho` du chant.

Un chant est *résolu* quand les deux conditions tiennent sur toutes ses
rangées d'accords.

Depuis l'itération 5, la seconde condition est **vraie par construction** :
le matcher ne choisit que dans le vocabulaire du `.cho`. Elle ne mesure donc
plus rien, et l'erreur qu'elle attrapait s'est déplacée vers « accord valide
mais faux » — que seul l'œil voit (mode C ci-dessous).

## Une itération

1. Lancer le pipeline sur le jeu de contrôle (puis sur les 124).
2. Calculer les métriques ci-dessous.
3. **Contrôle visuel — obligatoire, jamais sautable :**
   ```bash
   python3 scripts/jianpu/debug-render.py   # où l'on croit voir des accords
   python3 scripts/jianpu/read-render.py    # ce qu'on y lit
   ```
   Puis **regarder `debug/_planche.png`**, qui tient les deux modes
   d'erreur du classifieur :
   - **A — déclarées accords.** Toute rangée qui n'en est pas est un faux
     positif : des accords seraient redessinés au mauvais endroit.
   - **B — candidates ratées.** Toute rangée `?` juste au-dessus des
     chiffres. Les vraies rangées d'accords qui s'y trouvent sont les
     manques du classifieur.

   Puis **regarder `debug/_lecture.png`**, qui tient le troisième mode,
   apparu avec le matcher (itération 5) et invisible sur la planche :
   - **C — mal lue mais gardée.** Une étiquette au-dessus du seuil dont
     l'accord retenu n'est pas celui qui est imprimé. C'est le seul cas où
     l'on écrit un **faux accord** sur la partition ; les compteurs le
     comptent comme une réussite.

4. **Contrôle du calque par transposition**, sur tout chant publié :
   ```bash
   python3 scripts/jianpu/compare-render.py <slug>
   ```
   La partition est rendue **transposée d'un demi-ton**, tonalité où aucun
   accord ne garde son nom, et empilée sous l'originale. **Tout accord
   identique en haut et en bas est un accord manqué.** Aucune connaissance
   musicale n'est nécessaire : il suffit de comparer deux lignes.

   Attention : `compare-render` **ne montre que les bandes** où le calque
   publie ou bien où le classifieur a hésité. Il ment donc par omission, et
   c'est ainsi qu'un système entier est resté en D sur 不停赞美
   (itération 13).

5. **Audit de la page entière**, avant toute certification :
   ```bash
   npm run jianpu:audit <slug>                   # navigateur — la référence
   python3 scripts/jianpu/audit-page.py <slug>   # rendu Python, sans navigateur
   ```
   Les deux rendent la même planche. **La planche navigateur fait foi**
   (itération 38) : `audit-page.py` redessine la page avec PIL, *à côté* du
   composant réel, et ne voit donc ni le fond opaque qui rogne l'étiquette
   voisine, ni l'accord réécrit qui sort de la page, ni le thème sombre —
   trois défauts que seule la capture navigateur attrape. Le rendu Python
   reste utile quand le serveur de dev n'est pas disponible.

   Tranches qui se recouvrent, original au-dessus, rendu transposé
   dessous, cadres de contrôle activés. C'est le seul contrôle
   qui voie le mode **D — rangée entièrement manquée**, que ni la planche,
   ni les compteurs, ni `compare-render` n'attrapent, parce qu'une rangée
   jamais détectée n'apparaît dans aucun dénominateur. Sur une page
   transposée elle reste écrite dans l'ancienne tonalité, à côté d'accords
   transposés : la page mélange deux tonalités, ce qui est **pire que de
   n'avoir aucun calque**. **Un accord sans cadre n'est pas converti.**

   Ce qu'il reste à lire dans les rangées déjà connues se sort à côté avec
   `propose-extra.py <slug>… --all`, pré-filtre par score levé — plusieurs
   chants par passe depuis l'itération 33, et `--hidden` pour ouvrir en plus
   les rangées que le classifieur a rangées ailleurs **ou qu'il n'a jamais
   isolées** (mode D : `hidden_rows` et `welded_rows`).

   Les rangées **soudées** — jamais isolées par le découpage, donc invisibles
   à tout le reste — se cherchent en plus sur les pages déjà finies
   (itération 39), et c'est le seul contrôle qui les y voie :
   ```bash
   python3 scripts/jianpu/worklist.py --certifiées
   ```

   `propose-extra.py --wide` (itération 34) ratisse le corpus entier et ne
   garde que les amas d'au moins quatre hauteurs d'étiquette : les **étiquettes
   composites** (`F或F/Eb`, `Gm代替Bb`, `先F后F#dim`, un groupe entre
   parenthèses, une ligne d'intro). Depuis que `transpose_label` réécrit la
   ligne entière, ce sont des étiquettes comme les autres — et les laisser est
   ce qui reste de pire, puisqu'elles maintiennent la page à deux tonalités.
5bis. **`chord_rows` court-circuite tout** (itération 42). Une page dont le
   `gold/` porte `chord_rows` — la transcription complète, voie de
   l'itération 6 — publie **uniquement** ce que cette transcription couvre :
   `corrections`, `not_rows` et `not_labels` n'y sont même pas lus, et toute
   rangée absente ou dont le compte d'amas a bougé est sautée en silence. Une
   transcription partielle laisse donc des rangées entières dans l'ancienne
   tonalité, sans qu'aucun correctif puisse y atteindre. Avant de travailler
   une page, vérifier :
   ```bash
   python3 -c "import json;print(bool(json.load(open('scripts/jianpu/gold/<slug>.json')).get('chord_rows')))"
   ```
   Si oui et que la page n'est pas gelée : la passer à la voie de lecture
   (retirer `chord_rows`, en garder le contenu en clair dans
   `chord_rows_retire`), puis combler par `corrections`.

6. **Accords gravés hors du `.cho`** (itération 33) :
   ```bash
   python3 scripts/jianpu/propose-chords.py              # amas non couverts
   python3 scripts/jianpu/propose-chords.py --published  # étiquettes publiées
   ```
   Le vocabulaire fermé ne se contente pas de ne rien lire : il publie le
   plus proche. Le script rejoue la lecture contre un vocabulaire ouvert et
   propose les accords manquants, que l'œil confirme avant `extra_chords`.
   Il **ne remplace pas l'audit** : sur 握住幸福 il a manqué les deux faux
   accords que l'audit a vus.

   **Tout ce qui s'écrit dans `gold/` est dans la convention du `.cho`**, y
   compris `extra_labels` — `build-chords` applique le décalage
   `song_semitones` à la frontière (itération 34). Sur une page gravée dans
   une autre tonalité que son `.cho`, recopier un accord *tel qu'imprimé*
   publie donc un accord faux du décalage, et faux de façon plausible :
   `C#/F` recopié de 永恒唯一的盼望 ressortait `C/E` (itération 40).
   Vérifier avant d'écrire :
   ```bash
   python3 -c "import sys;sys.path.insert(0,'scripts/jianpu');
   from match import song_semitones;print(song_semitones('<slug>'))"
   ```
7. **Rangées gravées dans une autre tonalité** (itération 31) :
   ```bash
   python3 scripts/jianpu/foreign-scan.py --large --planche
   ```
   Le test de `foreign_rows` appliqué à **toutes** les rangées du
   classifieur, et pas aux seules rangées lues — une rangée en tonalité
   étrangère est justement celle que le classifieur n'ose pas promouvoir.
   `--large` relâche les seuils, qui sont réglés pour la publication et non
   pour la revue. Les rangées retenues se recopient en `mask_rows`, après
   avoir rendu la rangée et sa jumelle **côte à côte** : sans ça on masque
   la mauvaise.
8. **Cadre « 1=X »** (itération 35), sans lequel une page ne peut pas être
   complète :
   ```bash
   python3 scripts/jianpu/measure-keylabel.py                  # les publiés sans cadre
   python3 scripts/jianpu/measure-keylabel.py --pick <slug>=<n>
   ```
   Le détecteur s'ancre sur le glyphe `=` — deux barres jumelles isolées —
   et propose **toutes** les candidates, ligne de tempo `♩=NN` comprise :
   c'est l'œil qui élit, sur la planche. Ne jamais poser un cadre sans avoir
   confronté la **lettre gravée** à `printedKey` : sur 十架的爱 la page
   imprime `1=F` sous un `printedKey` de `D`, et poser le cadre y écrirait
   une clé de lecture fausse pour toute la page.

   **Une page peut ne pas écrire « 1= » du tout** (itération 41), et
   `measure-keylabel`, ancré sur le « = » avec un « 1 » à sa gauche, est alors
   structurellement aveugle : 赞美之泉 grave la **lettre seule** collée au
   chiffrage (« D 4/4 »), 你们要赞美耶和华 l'écrit **à l'envers** (« F=1 »).
   Il faut aussi se méfier de ce qu'il propose : sur 一生跟随 et 哦十字架 sa
   candidate était la **ligne de tempo** ♩=80 / ♩=100.

   Ce que la page grave se recopie dans `key_label.c`, tel qu'imprimé et dans
   la convention du `.cho` : le client le transpose alors **comme une
   étiquette** au lieu d'écrire `1=<tonalité jouée>`. C'est indispensable dès
   que la lettre gravée n'est pas celle des accords — 十架的爱 grave « 1=F »
   au-dessus d'accords en D, qui sont des positions de capo 3. La grammaire
   décide : « 1= F » (l'espace compte) donne « 1= Gb », « F=1 » donne
   « Gb=1 », « 1=F » sans espace ne bouge pas. Sans `c`, rien ne change.

   **Le cadre se pose dans `key_label`, jamais en `extra_label`** : `complete`
   et le bandeau « seuls les accords en bleu ont été transposés » se lisent
   tous deux sur `key_label`, et un cadre publié ailleurs laisse une page
   complète marquée PARTIEL et le bandeau annoncer un « 1=X » d'origine que la
   page n'affiche plus (itération 41).

   Un **second** cadre, gravé au milieu d'un système à la mesure où le
   morceau change de ton, échappe à `measure-keylabel` (qui ne regarde que
   le haut de page à gauche) comme à `chords.json` (qui ne tient qu'un
   `keyLabel` par page) — itération 40 :
   ```bash
   python3 scripts/jianpu/inline-key.py            # tout le corpus
   ```
   Il s'ancre sur le « = » de la **page entière** et propose tout ; l'œil
   élit sur la planche, puis recopie le cadre en `extra_labels` avec son
   texte gravé (« 1= G », **l'espace compte** : sans lui, `transposeLabel`
   voit un seul jeton et ne réécrit rien) et un `fh` réglé pour ne pas
   effacer la barre de mesure voisine.
9. **Banc automatique**, qui mécanise l'oracle de la transposition sur les
   49 pages certifiées d'un coup :
   ```bash
   npm test                      # les 3 premières certifiées (rapide)
   PW_SLUGS=all npm test         # les 80 certifiées
   PW_SLUGS=<slug> npm test      # une page
   ```
   Il rejoue au demi-ton au-dessus et refuse toute étiquette restée
   identique, toute étiquette sortie vide, et toute étiquette qui déborde de
   l'image. Il ne voit **pas** le mode C — un accord faux mais transposé lui
   convient : il ne remplace donc jamais la planche, il dit seulement où
   regarder.
9bis. **Banc du matcher**, avant et après tout réglage de gabarit :
   ```bash
   python3 scripts/jianpu/bench-match.py --geler   # fige la référence
   python3 scripts/jianpu/bench-match.py --tous    # mesure + amas qui ont bougé
   ```
   Il rejoue la lecture contre les deux jeux étiquetés que la boucle a déjà
   écrits sans jamais s'en servir pour mesurer : les `corrections` (les amas
   durs, ceux où le matcher avait échoué) et les `frozen_labels` (le corpus
   entier des pages certifiées, cas faciles compris). Sans lui, un réglage de
   gabarit se juge sur une planche, qui dit si *cette* page va mieux et rien
   des cent autres — c'est ainsi que la géométrie de l'exposant est restée
   quatre itérations sur la valeur la plus mauvaise de sa grille
   (itération 46).

   **Un compteur qui monte ne suffit pas** : `--tous` nomme les amas gagnés
   et perdus, et c'est là qu'on voit qu'un réglage gagne sur une famille de
   pages en cassant une autre.
10. Lire les planches, nommer les inconnues, ajuster les paramètres.
11. Écrire les seuils dans `classifier.json`, les paramètres de lecture dans
   `match.py`, et mettre à jour le journal ci-dessous.

**Une `correction` l'emporte sur la lecture** (itération 46) : elle est lue
*avant* `keep()`, pas après. C'est le seul recours contre le mode C — un
accord retenu et faux —, qui n'en avait aucun : écrire la correction ne
faisait rien, et il fallait `not_labels` + `extra_labels` pour y arriver en
trois champs.

**Une itération ne peut pas être déclarée en progrès sur les seuls
chiffres.** Le journal doit dire ce que l'œil a vu et que la métrique
ratait — l'itération 1 affichait 18/18 alors que l'en-tête était mal
classé et qu'une ligne d'intro entière était perdue, simplement parce que
la vérité terrain ne couvrait pas ces rangées. Une métrique ne mesure que
ce qu'on a déjà pensé à regarder.

## Critère d'arrêt

≥ 95 % des 124 partitions résolues, **ou** deux itérations consécutives sans
progression de la couverture.

## Jeu de contrôle

7 chants couvrant les deux familles de gravure rencontrées :

| Chant | Gravure | Accords | Vérité terrain |
|---|---|---|---|
| 何等恩典 | aérée | courts (C, G, G/B) | **établie** (18 rangées) |
| 齐来赞美 | aérée | courts | à établir |
| 主的喜乐是我力量 | aérée | moyens | à établir |
| 我心坚定与你 | aérée, **2 rangées d'accords** | courts | à établir |
| 爱赢了 | serrée | longs (Dmaj9, Esus4) | à établir |
| 献上尊荣 | serrée | moyens | à établir |
| 你们要赞美耶和华 | hymnaire, étiquettes minuscules (14 px) | courts | à établir |

`你是配得` retiré du jeu : le slug réel est `你是配的` (coquille dans le
`{title:}` du `.cho`). À corriger séparément, hors de cette boucle.

Le dernier avait été retenu comme cas limite « sans accords imprimés », et
la rangée qu'on y trouvait comptée comme faux positif pendant quatre
itérations. **C'est faux** : la planche de lecture montre `C F F ♭B C7` bien
imprimés au-dessus des chiffres (itération 5). Il reste utile au jeu, mais
pour une autre raison : ses étiquettes sont si petites que le découpage en
rangées les tronque.

## Métriques

| Itération | Rangées d'accords trouvées (jeu de contrôle) | Étiquettes appariées | Chants résolus /124 |
|---|---|---|---|
| 0 (départ) | 0 / 7 chants | — | 0 |
| 1 | **4 / 7 chants** (gravure aérée uniquement) | pas de matcher | 0 |
| 1b | contrôle visuel ajouté (`_planche.png`) · A=23 déclarées accords, quasi toutes justes · **B=14 candidates dont 6 vraies rangées manquées** — cause unique : les arcs de liaison, pris pour des ligatures | pas de matcher | 0 |
| 2 | **6 / 6 chants** avec accords · A=29 dont 1 faux positif · B=8 ratées | pas de matcher | 0 |
| 3 | inchangé (test négatif) | pas de matcher | 0 |
| 4 | A=29 · B=16 dont **7 vraies ratées** | pas de matcher | 0 |
| 5 | inchangé (A=29 · B=16) | **108 / 167 amas retenus, dont 97 justes** · 0 parasite gardé | 5 /124 entièrement appariés (2547/3554 amas, 72 %) |
| 6 | inchangé | 85 / 144 étiquettes · **0 mal lue, 0 parasite** | **3 /124 calques publiés** (contrôlés par transposition) |
| 7 | **A=39 · B=6** · orphelines du corpus 172 → **0** | 89 / 144 · 0 mal lue, 0 parasite · corpus **50 %** (2310/4651) | 3 /124 (inchangé) |
| 8 | +90 rangées (accords courts récupérés) · planche **A=45 · B=5** (les 5 : titres et crédits) | inchangé | **1 /124** — les 2 autres étaient **faux** et sont dépubliés |
| 9 | inchangé | vocabulaire élargi **rejeté** (95 → 76 justes) | 1 /124 — `verified` devient obligatoire |
| 10 | +151 étiquettes lues à l'œil (1199 → 1344 publiées) | repêchage automatique **rejeté** (3 gardes, tous percés) | **2 /124 certifiés** (能不能, au navigateur) |
| 11 | 到各山岭去传扬 complété (rangée à deux hauteurs) | 44 cadres 1=X transcrits sur grille : **12+ faux au rendu fidèle → lot retiré** (stash) | **3 /124 certifiés** (齐来赞美) |
| 12 | corpus **125** (+哦十字架, un 简谱 égaré parmi les 五线谱) | **24 cadres 1=X mesurés par vote du matcher**, relus, validés au rendu fidèle · 22 restent (tempo fusionné, hymnaire, capo) | 3 /125 |
| 13 | inchangé | +13 étiquettes à l'œil (爱我愿意, 不停赞美) | **5 /125 certifiés** (爱我愿意, 不停赞美) |
| 14 | rangées mêlées ouvertes au matcher (+32 candidates) | +31 étiquettes relues | **6 /125 certifiés** (全新的你) |
| 15 | **3 rangées entières manquées** trouvées sur 3 pages auditées (mode D) | +40 étiquettes relues (`--all` : le pré-filtre levé) | **9 /125 certifiés** (把冷漠变成爱, 是为了爱, 拣选) |
| 16 | jeu de test élargi : **232 étiquettes de cas durs** (les `extra_labels`) | approche du `/` et poids de la basse **tous deux rejetés** (95 → 95) | 9 /125 · les 9 sont **gelés** |
| 17 | garde « deux par rangée » levé : **21 → 188 propositions**, 173 vraies | +12 étiquettes relues, dont 6 que le matcher lisait faux | 9 /125 · **une page à deux tonalités** découverte |
| 18 | — | — | **11 /125 certifiés** (永活盼望, 到各山岭去传扬) · `titleKey` |
| 19 | jeu de contrôle élargi à une 3ᵉ gravure (永恒唯一的盼望, 29 étiquettes) : **116/179** contre 107 sous l'ancienne fonte unique | fonte de page : sur la nouvelle famille, **12 → 21 justes**, 0 FAUX | 11 /125 · **calques publiés 50 → 67** |
| 20 | 112/179 · **FAUX = 0** tenu · cas durs 218 → 223 identifiées | la vérité terrain devient un **veto** sur le choix de fonte | **12 /125 certifiés** (一颗谦卑的心) · calques **67 → 78**, 2024 → 2349 étiquettes |
| 21 | 1 modulation et 5 pages à rangées empilées trouvées par leur **contenu** | rangées en tonalité étrangère écartées de la publication | 12 /125 · calques 78 → 77 (有你同行 **cesse de publier de faux accords**) |
| 22 | planche inchangée (A=45 · B=5) · contrôle 112/179, **FAUX = 0** tenu | 19 rangées d'accords rendues visibles · 327 candidates proposées, **38 confirmées** | 12 /125 · calques 77 → **78**, 2313 → **2438** étiquettes · rangées cachées **23 → 11** |
| 23 | planche A=45 → 49 (4 faux positifs qui ne publient rien) · contrôle 112/179, **FAUX = 0** tenu | rangée de mélodie reconnue au **nombre d'amas** · 5 faux accords corrigés par le veto de la vérité terrain | 12 /125 · calques 78 → **79**, 2438 → **2525** étiquettes · rangées cachées **11 → 7** |
| 24 | contrôle 112/179, **FAUX = 0** tenu · `dissent.py` classe les étiquettes publiées par le désaccord entre fontes | **8 faux accords trouvés** sur 29 contestées, tous invisibles aux compteurs · 12 étiquettes versées en vérité terrain | 12 /125 · calques 79 → **78** (唯独依靠你 dépublié), 2525 → **2500** étiquettes |
| 25 | contrôle 112/179, **FAUX = 0** tenu · `dissent.py --isolated` classe les étiquettes **seules dans leur rangée** | **3 parasites publiés** trouvés sur 36 zooms (2 arcs de liaison, 1 titre anglais) · `not_labels` les retire | 12 /125 · calques **78** inchangés, 2500 → **2497** étiquettes |
| 26 | contrôle 112/179, **FAUX = 0** tenu | 22 amas relus sur les pages au ras du plancher · le veto de fonte voit enfin les `corrections` | 12 /125 · calques 78 → **81**, 2497 → **2559** étiquettes |
| 27 | contrôle 112/179, **FAUX = 0** tenu | 25 amas relus · `not_rows` retire une rangée de paroles promue à tort | 12 /125 · calques 81 → **84**, 2559 → **2683** étiquettes |
| 28 | corpus **127** (+2 partitions fournies) · planche A=7 · B=0 sur les deux | 40 amas relus · `mask_rows` masque les rangées de **capo** | **14 /127 certifiés** · calques 84 → **86**, 2683 → **2801** étiquettes |
| 29 | 55 cadres « 1=X » proposés d'un coup, **24 retenus** en 6 planches de lot | **5 pages sur 6 cachaient un défaut que la couverture ne voit pas** : 2 rangées entières jamais détectées, 1 rangée alternative parenthésée, 5 rangées de capo, 1 paire parenthésée | **20 /127 certifiés** · calques 86 (inchangé), 2801 → **2865** étiquettes · cadres 1=X 31 → **55** |
| 30 | les 8 pages « 1 rangée cachée » de `worklist` traitées en lot · 31 rangées non publiées rendues sur 2 planches | **11 rangées d'accords entières récupérées** (dont la 1ʳᵉ et la dernière d'une page) · 7 rangées d'une **seconde tonalité** masquées · 40 amas relus, 8 lus faux par le matcher | **27 /127 certifiés** · calques 86 (inchangé), 2865 → **3034** étiquettes · cadres 1=X 55 → **59** |
| 31 | `foreign-scan.py` applique le test de tonalité étrangère à **toutes** les rangées du classifieur, pas aux seules rangées lues · **15 rangées** sorties sur 6 pages, toutes vraies · 1 faux positif (une alternative parenthésée) | contrôle 112/179, **FAUX = 0** tenu · une rangée masquée **s'empilait** sur les `extra_labels` posées à la main au lieu de les annuler — 4 étiquettes dans ce cas, rangée transposée à moitié | **31 /127 certifiés** · calques 86 (inchangé), 3034 → **3158** étiquettes · cadres 1=X 59 → **60** |
| 32 | contrôle 112/179, **FAUX = 0** tenu · la file « PRÊT » est **vidée** : les trois qui restent sont toutes bloquées par un accord à alternative (`或`) | **le vocabulaire fermé publiait de faux accords** — F/A pour F/C, G7 pour C7, unanimes et au-dessus du seuil ; `extra_chords` les corrige sans rien déplacer d'autre · 3 cadres « 1=X » mesurés à la main, dont un bémol **exposant** | **34 /127 certifiés** · calques 86 (inchangé), 3158 → **3188** étiquettes · cadres 1=X 60 → **63** |
| 33 | **la file « PRÊT » n'était pas vide, le compteur était aveugle** : `worklist` mesurait le matcher et non le calque, donc une page réparée à la main restait « 10 à relire » pour toujours — 3 prêts affichés, **18 réels** · le test de rangée cachée laissait passer 3 rangées entières sur une page notée « 22/22, 100 %, PRÊT » | `propose-chords.py` cherche les accords gravés **hors du `.cho`** sur tout le corpus, dans les amas non couverts et (mode `--published`) sous les étiquettes déjà publiées · 34 amas relus, 3 faux accords trouvés — mais **pas les deux que l'audit a trouvés** sur 握住幸福 | **38 /127 certifiés** (让爱走动) · calques 91, 3323 → **3412** étiquettes · cadres 1=X 67 (inchangé) — les écarts avec la ligne 32 (86 calques, 3188 étiquettes, 34 certifiés) viennent du travail fait **après** la rédaction de ce journal-là : six pages de vérité terrain de plus |
| 34 | le modèle « une étiquette = un accord » levé : `transpose_label` réécrit **la ligne entière**, jeton par jeton · `propose-extra --wide` sort les étiquettes composites du corpus (90 amas, 44 pages) · mode D retrouvé sur **5 des 6 pages certifiées** | **le calque publiait dans la tonalité du `.cho` et non dans celle gravée** — 65 accords faux sur les 2 pages où les deux diffèrent, chacun juste dans sa propre convention · contrôle 112/179, **FAUX = 0** tenu | **44 /127 certifiés** (让赞美飞扬, 因着十架爱, 云上太阳, 使命, 你坐着为王, 我们成为一家人) · calques 91 (inchangé), 3412 → **3450** étiquettes · cadres 1=X 67 (inchangé) |
| 35 | **22 des 24 cadres « 1=X » proposés étaient faux**, et la cause n'était pas le score : le filtre de hauteur des bandes **supprimait la bonne candidate** sur les gravures serrées, et l'argmax sans plancher rendait quand même une boîte · le détecteur s'ancre maintenant sur le glyphe `=`, sans découpage préalable — **20 libellés lus sur 24 pages**, tous relus à l'œil | audit des 67 cadres publiés : **齐来赞美 (certifiée) masquait sa fraction 4/4** depuis l'itération 11 · 十架的爱 grave `1=F` sous un `printedKey` de `D` — le do du 简谱 et la tonalité des accords ne coïncident pas toujours, cadre écarté | 44 /127 (inchangé) · calques 91 (inchangé), 3450 étiquettes (inchangé) · cadres 1=X **67 → 86** · file « PRÊT » bloquée par un cadre : **8 → 1** |
| 36 | **deux pages demandées en priorité, prises de bout en bout** : 我们呼求 n'avait aucun calque (24/49 lus, sous le plancher de 60 %) et 我能给你什么 était à 31/48 · sur chacune, la rangée entière manquée (mode D) était une rangée que le classifieur avait rangée en « ? » ou « chords? » — 2ᵉ ligne d'intro pour l'une, **alternatives parenthésées** « ( Em7b5   A7 ) » et « (C/Bb) » pour l'autre | un **mode C** trouvé à l'audit et non par les compteurs : 我能给你什么 publiait `F7` là où la page grave `G7`, à +0,32, retenu et unanime · un défaut de rendu que ni la planche ni les compteurs ne voient : **le fond opaque d'une étiquette rogne sa voisine** quand le nom cible est plus large que le gravé — « A#7/F G#/A# » sortait « A#7/ G#/. », deux basses perdues ; l'étiquette composite le règle | **46 /127 certifiés** (我们呼求, 我能给你什么) · calques 91 → **92**, 3450 → **3517** étiquettes · cadres 1=X 86 → **87** · 1 mention « （X调） » de titre de plus |
| 37 | **une rangée `chords?` que le matcher écarte tombait de partout** — ni `crop_labels` ni le test de rangée cachée ne la voyaient, donc elle n'entrait dans aucun dénominateur : 认识你真好 affichait « 27/27, 100 %, PRÊT » avec **trois** rangées d'alternatives jamais converties · le banc de **détection** apprend les formes parenthésées (`(C`, `D/F#)`), point aveugle des itérations 29, 34 et 36 · `audit-page` encadre les suspects en rouge | **39 clés `not_labels` écrites « x,y » là où le code lit « y,x »**, sur 15 pages, inertes depuis toujours — aucune n'était publiée, mais chacune bloquait sa page · deux trous de grammaire dans `transpose_label` : la basse seule (`/F`) et `Am(maj7)` restaient verbatim au milieu d'une étiquette transposée · `fh`, le corps propre à une étiquette : sans lui une ligne d'intro réécrite au corps de la page déborde sur les crédits | **49 /127 certifiés** (认识你真好, 握住幸福, 我安然居住) · calques 92 (inchangé), 3517 → **3541** étiquettes · cadres 1=X 87 (inchangé) · contrôle 112/179, **FAUX = 0** tenu |
| 38 | **le contrôle visuel passe au navigateur** : `audit-browser.ts` (planche), `sweep-browser.ts` (balayage géométrique + encre couverte, au pixel), `zoom-browser.ts` (une étiquette grossie) · banc automatique de **197 tests** Playwright sur les 49 certifiées | `labelH` **mesuré sur les pixels** au lieu de la médiane des boîtes — 64 pages sur 92 changent, jusqu'à −25 % · `sp` : place libre jusqu'à l'encre voisine, l'étiquette **rétrécit pour tenir** (6 % des étiquettes, plancher 0,80×) · **74 doublons exacts** retirés | 49 /127 (inchangé) · pages sans défaut de rendu **15 → 35 /49** · hors-page **5 → 0** · chevauchements **97 → 19** · encre gravée couverte **83 → 9** |
| 39 | **la rangée soudée à ses chiffres** : `welded_rows` promène une fenêtre de la hauteur d'une rangée d'accords **de la page** dans toute bande que le classifieur n'a pas typée `chords` — le mode D dans sa forme la plus dure, trouvé jusqu'ici à l'œil seulement · **6 rangées vraies sur 92 pages**, dont une sur une page **certifiée** et une sur une page notée PRÊT | 全新的你, certifiée depuis le 5 août, publiait **2 accords sur 5** de sa dernière rangée : transposée, la page lisait `Gb  C/E  Dm  Ab7  C` — deux tonalités à la fois · le filtre de doublons passe de la boîte **exacte** à la boîte qui **se recouvre** : 14 paires sur 6 pages, dont 3 accords isolés restés sous le composite qui les remplaçait | **50 /127 certifiés** (大声敬拜, 全新的你 réparée) · calques 92 (inchangé), 3467 → **3462** étiquettes (−14 doublons, +9 lues) · cadres 1=X 87 (inchangé) · pages sans défaut de rendu **75 → 80 /92** · banc Playwright 201 tests, tous verts |
| 40 | **le second cadre « 1=X », gravé dans la portée** : une gravure qui change de ton au dernier refrain l'écrit au milieu d'un système, et `chords.json` ne tient qu'**un** `keyLabel` par page — la page transposée annonçait `1=Ab` en tête et `1=G` au milieu · `inline-key.py` rejoue l'ancrage sur le « = » (itération 35) sur la **page entière** : 44 candidates lues, **2 vraies**, et le corpus n'en cache pas d'autre | les deux rangées **soudées** nommées à l'itération 39 traitées de bout en bout · **un `extra_label` s'écrit dans la convention du `.cho`, pas dans celle de la page** : sur 永恒唯一的盼望 (gravée en E sous un `.cho` en F) « C#/F » recopié tel qu'imprimé publiait `C/E` — juste dans sa propre convention, faux d'un demi-ton sur la page | **59 /127 certifiés** (我们欢迎君王降临, 爱的彰显, 脚步, 永恒唯一的盼望, 我们的神, 旷野中唯一的力量, 主的喜乐是我力量, 一切歌颂赞美, 圣灵的江河) · calques 92 (inchangé), 3462 → **3504** étiquettes · cadres 1=X 87 (inchangé) + 2 cadres en portée · file « PRÊT » 12 → **3** · pages sans défaut de rendu **80 → 79 /92** (un « Bbmaj7 » qui recouvre l'arc sous lui) · banc Playwright 237 tests, tous verts |
| 41 | **une page peut annoncer sa tonalité sans écrire « 1= »** : 赞美之泉 grave « D 4/4 » (la lettre seule), 你们要赞美耶和华 « F=1 » (l'ordre inverse) — invisibles à un détecteur ancré sur le « = » avec un « 1 » à gauche · sur 2 des 3 autres pages sans cadre, la candidate proposée était la **ligne de tempo** ♩=NN · cadres « 1=X » **87 → 92 sur 92 calques**, le corpus publié est couvert | `key_label.c`, le champ distinct pour le **do gravé** réclamé depuis l'itération 35 : transposé comme une étiquette au lieu d'être remplacé par la tonalité jouée, il rend enfin le « 1=F » de 十架的爱 (gravé au-dessus d'accords en D, des positions de capo 3) · **le cadre était rendu 0,71× trop petit sur les 92 pages** — `h` est une hauteur de capitale, pas un corps : l'erreur corrigée pour les accords à l'itération 38, que le cadre n'avait jamais reçue faute d'être regardé par quoi que ce soit (`data-jianpu-keylabel` ajouté au balayage et à la planche) | **62 /127 certifiés** (好喜欢与你在一起, 十架的爱, 赞美之泉) · calques 92 et étiquettes 3504 inchangés — l'itération n'a lu aucun accord, elle a réparé l'appareil · file « PRÊT » **vide**, 0 rangée cachée ou soudée sur les 30 restantes comme sur les 62 certifiées · encre couverte **16 inchangée** et pages sans défaut **79 /92 inchangées**, cadres compris, alors que 91 gagnent 40 % de corps · banc Playwright 249 tests, tous verts |
| 42 | **爱赢了 n'était pas une page difficile, c'était un dénominateur faux** : sur ses « 71 amas à relire », **52 ne sont pas des accords** (deux rangées d'arcs de liaison et une rangée de chiffres typées `chords`) et 10 sont des **marques de navigation** — ⊕, 𝄋, D.S., coins de crochet ⌐1 / ⌐2 — que cette gravure imprime sur la rangée d'accords elle-même · le **filet horizontal** du crochet de reprise soude « Asus4 A Asus4 A » en un amas de 993 px que rien ne voyait : compter la **hauteur** d'encre par colonne au lieu de sa présence les sépare (`_split_welded`, +11 propositions sur le corpus) | **la voie « vérité terrain » ignore `corrections`, `not_rows` et `not_labels`** : une page qui porte `chord_rows` ne publie que ce que la transcription couvre et saute le reste en silence — 爱赢了 avait 4 rangées transcrites sur 11 et laissait six rangées entières dans la tonalité d'origine, sans qu'aucun correctif puisse y atteindre. 7 pages concernées, 6 gelées, les 2 vivantes passées à la voie de lecture · le filtre des rangées ouvertes de `propose-extra --all` testait une **égalité exacte** entre le haut de bande et le `y` d'une étiquette : une rangée coupée en deux devenait invisible, ses étiquettes publiées comprises (l'erreur de l'itération 14, rejouée) · **un amas peut être plus petit que sa lettre** : la rangée 806 de 你们要赞美耶和华 sort sur 14 px là où les lettres en font 37 | **64 /127 certifiés** (爱赢了, 你们要赞美耶和华 — la gravure hymnaire du jeu de contrôle, dont le matcher ne garde **aucune** lecture) · étiquettes 3504 → **3531**, calques 92 et cadres 92 inchangés · file « PRÊT » vide, 0 rangée cachée ou soudée sur les 28 restantes comme sur les 64 certifiées · pages sans défaut **79 /92 inchangées** · banc Playwright 257 tests, tous verts |
| 43 | **un accord encadré n'est pas un accord converti** : `transposeLabel` publie l'étiquette, l'audit l'encadre, et le texte peut malgré tout sortir verbatim — `[Gm]`, l'accord de remplacement que 一粒麦子 grave entre crochets, restait en fa au milieu d'une rangée en fa dièse · le chemin « une seule part » court-circuitait les crochets de bord de `transposeRun`, et rien ne le voyait : ni les compteurs (l'étiquette est publiée), ni le balayage (elle ne déborde de rien), ni le banc Playwright, qui mécanise pourtant cet oracle exact mais **sur les seules pages certifiées** — c'est-à-dire jamais là où le défaut vit | correction miroir dans `transposeLabel` et `transpose_label`, en **second recours** seulement : à un décalage non nul, un accord que `transposeChord` a su lire change toujours de nom, donc l'égalité vaut échec · mesuré sur **442 332 rendus** (toutes les étiquettes publiées × 11 décalages × 12 tonalités) : **132 changent, toutes la même** · le dénominateur ment encore : sur les 4 pages prises, 11 des 25 amas à relire sont des **marques de navigation** (segno, 【Chorus】, 【Bridge】, D.S. al Fine) et **5 rangées entières** typées `chords` n'en sont pas — trois rangées de chiffres, une rangée de crochets de reprise, un bloc de titre | **68 /127 certifiés** (求主充满我, 这里有神的同在, 我愿为你去, 一粒麦子) · étiquettes 3531 → **3545**, calques 92 et cadres 92 inchangés · file « PRÊT » vide, 0 rangée cachée ou soudée sur les 24 restantes · pages sans défaut **79 → 77 /92** (deux fonds qui débordent sur leur propre gravé, zoom à l'appui) · banc Playwright **273 tests**, tous verts |
| 44 | **le cadre « 1=X » n'entrait pas dans le test de chevauchement** : entré dans celui de l'encre couverte à l'itération 41, jamais dans l'autre, parce que le balayage lit ses boîtes par `overlayLabels`, qui ne demande que `[data-jianpu-label]` — 和散那 publiait un `F` **sous son propre cadre de tonalité**, le « F » de « 1=F » promu accord par une rangée d'en-tête typée `chords` · un accord **tombé entre deux bandes** : le premier système de 和散那 n'en porte qu'un, 13 px sur 24, trop peu d'encre pour que le découpage lui fasse une bande — ni `hidden_rows` (qui teste une bande mal typée) ni `welded_rows` (qui fouille une bande trop haute) ne supposent son absence | **la hampe du bémol exposant survivait au nom réécrit** : « B♭ » grave son bémol au-dessus et à droite, plus haut que la bande de rangée, si bien que 圣灵的江河 — certifiée — affichait un trait vertical de 13 px au-dessus de chaque `B/Db`, c'est-à-dire le bémol qu'il est · aucun contrôle ne le voyait : le balayage ne mesure l'encre couverte qu'**à droite**, la planche encadre sans rien dire du haut · `haut_grave` remonte la boîte sur une **hampe** — trace fine (≤ 0,20 × la largeur) et contiguë à l'encre de l'étiquette — jamais sur un filigrane ni un arc : les deux familles ne se touchent pas (0,09 au pire contre 0,27 au mieux), **43 étiquettes sur 11 pages** · une rangée **d'alternatives** gravée au-dessus de l'autre (la version pour enfants de 如果你想知道, entre parenthèses) laissait la page à deux tonalités | **72 /127 certifiés** (和散那, 如果你想知道, 我要全心赞美, 荣耀的呼召) · étiquettes 3545 → **3571**, calques 92 et cadres 92 inchangés · banc Playwright **309 tests** : l'oracle de transposition tourne désormais sur les **92** calques et plus seulement sur les certifiés · `orphan_rows` ajouté à `worklist` : 0 accord orphelin sur tout le corpus · file « PRÊT » vide, 20 pages restantes |
| 45 | **le plancher de `hidden_rows` taisait la rangée d'alternatives** : il exigeait 3 amas, or une gravure qui double ses accords entre parenthèses n'en pose souvent que **deux** par système · 如果你想知道 en portait deux rangées ; l'une a été trouvée à l'audit de l'itération 44, l'autre était **sur la même planche, tranche 3**, et l'œil est passé dessus — la page a été certifiée avec, et publiée à deux tonalités une journée durant · `hidden_rows` ne tournait pas non plus sur les pages certifiées, donc rien ne pouvait le rattraper | descendre le plancher à 2 sans rien d'autre sort **huit rangées de plus, toutes fausses, toutes à 1/2** ; exiger que les **deux** amas s'apparient les écarte toutes et garde la vraie — sur les 92 calques la règle du tout ou rien sort exactement une rangée, celle qui manquait · même règle dans `welded_rows`, qui partage ces gardes et gagnait deux faux positifs · **le cadre orange** : l'audit distingue enfin « publié » de « réécrit », une étiquette dont le rendu égale le gravé sort en 3 px orange — prouvé sur une étiquette forcée, 0 sur le corpus | **76 /127 certifiés** (一生跟随, 叫我抬起头的神, 哦十字架, 这里有荣耀) · étiquettes 3571 → **3605**, calques 92 et cadres 92 inchangés · banc Playwright **321 tests** · file « PRÊT » vide, 0 rangée cachée, soudée ou orpheline sur les 16 restantes **comme sur les 76 certifiées** · 4 gravures à altération **exposante** traitées, dont une à bémol **antéposé** (« ♭B ») que le matcher lit `C7` |
| 46 | **la vérité terrain servait à contourner le matcher, jamais à le mesurer** : `bench-match.py` rejoue la lecture contre les 236 `corrections` (les amas durs) et les 3002 `frozen_labels` (le corpus certifié), en 8 s · sans lui, un gabarit se juge sur une planche, qui dit si *cette* page va mieux et rien des cent autres | **gabarit à altération surélevée** — le motif nommé à l'itération 45 · dessiné avec la géométrie du chiffrage (0,62 / 0,38) il gagnait 20 amas et en perdait 13 : balayé sur 2311 étiquettes, ce couple est **le plus mauvais coin de la grille** (+4), le corpus veut une altération de la taille de la lettre seulement remontée (0,36 / 1,00, +22) · la **médiane des scores désignait le mauvais réglage** (主的喜乐是我力量 : médiane +0,02 → +0,13, exactitude 17/18 → 11/18) · **`corrections` passe avant `keep()`** — seul recours contre le mode C, qui n'en avait aucun · plancher de hauteur sur `hidden_rows` (une bande de 7 px ne porte pas d'étiquette) | **78 /127 certifiés** (我的家要荣耀主, 十字架的传达者) · calques 92 → **93**, étiquettes 3605 → **3676**, cadres 93 · banc du matcher 167 → **185** durs lus, 2082 → **2107** gelés relus, 28 amas gagnés contre 5 perdus · banc Playwright **328 tests** · 十字架的传达者 portait les trois défauts à la fois — 5 faux accords publiés, une rangée de 8 accords jamais isolée, 3 amas où un signe est soudé à un accord |
| 47 | **le banc mesurait dans la mauvaise convention** : `corrections` nomme comme le `.cho`, `frozen_labels` comme la page — 40 des 63 « lectures retenues et fausses » n'étaient que ce décalage (le piège de l'itération 34, reparu dans l'outil fait pour le mesurer) · comparaison par **hauteurs** et non par chaînes | **les trois signaux d'incertitude échouent** : score 1/8, marge 2/8 (193 justes à relire), désaccord des 7 fontes 3/8 (514 justes) — six des huit fausses ont une marge supérieure à la médiane des justes, trois sont unanimes sur les sept fontes. *Un jury de variantes d'un même modèle ne voit pas l'erreur du modèle.* · la vraie cause : le découpage **ampute les jambages** — `Gmaj7` sans la queue de son « j » a `F#m7` pour plus proche voisin · le débordement se fait dans les **deux** sens, et c'est le bas qui apporte tout (par le haut seul : rien) · garde de mode D dans `build-chords` | **79 /127 certifiés** (爱可以再更多一点点) · banc 197 → **234** durs lus, 37 → **76** publiables, mode C **8 → 3** (0,15 %) · calques 93 → **91** (奔跑不放弃 retenue par la garde, 2 pages sous le plancher) · étiquettes 3590, cadres 91 · banc Playwright **329 tests** |
| 48 | **les pages sous le plancher n'avaient aucun outil** — `propose-extra`, la planche d'audit et `dissent` lisent tous `chords.json`, où une page sous les 60 % n'est pas : les 36 pages qui ont le plus besoin d'yeux étaient celles que l'outillage refusait (3ᵉ fois de cette forme, cf. 33 et 37) · `build-chords` construit un calque **provisoire**, sans le plancher ni la garde de mode D | **38 % de la file « à relire » n'étaient pas des accords** : une barre de mesure fait 2 × 10 px et il y en a une par mesure — 319 amas → **199** sur les 91 calques, les 12 plus gros écartés rendus et regardés (12 arcs, 0 accord) · plancher à 5 × 11, sous la plus petite étiquette réelle (9 × 13 sur 3 174) · **deux réglages de chasse mesurés et rejetés** (chasse sur le corps : publiables 76 → 104 mais exactitude 234 → 213 ; meilleure de deux coupes : +1 mode C) — tous deux augmentent la *confiance*, et la confiance n'était pas ce qui était cassé (itération 47) | **80 /127 certifiés** (差遣我, douze amas tous lus juste et rejetés par le seuil) · calques 91, étiquettes 3602, cadres 91 · la file « PRÊT » passe de 0 à **5** sans qu'aucun travail ait été fait dessus — le compteur a cessé de compter des barres de mesure |

| 49 | **la file s'est vidée pour de bon** : les 11 pages qui avaient un calque non certifié ont été prises en une seule passe — `propose-extra --all --hidden` sur le lot (118 amas, 6 planches de zooms), écriture des `extra_labels`, **puis** l'audit navigateur, au lieu d'un audit avant *et* après par page ; le second aller-retour ne servait qu'à revoir ce qu'on venait d'écrire | **l'alternative parenthésée seule au-dessus de sa rangée n'a aucun outil** : 坐在宝座上圣洁羔羊 en porte quatre — (Gm7) ×2, (G/B ) ×2 — dans des bandes que le classifieur ne type pas `chords`, à 1 amas par bande, donc sous le plancher de `hidden_rows` (2 amas appariés depuis l'itération 45) et hors de `welded_rows` (qui fouille une bande *trop haute*) · seul l'audit les voit · **un accord peut être cité dans une phrase** : 神羔羊配得 écrit « （还有两个空小节 D7 G） » au corps du texte, deux accords vrais que `fh` rend à leur taille · **un amas peut être plus petit que 5 px** : le premier `F` de 你是配的 sort sur 4 px et celui de 坐在宝座上圣洁羔羊 sur 3, tous deux écartés par le plancher de l'itération 48 | **91 /127 certifiés** (再次将我更新, 愿为主闪亮, 我们是光明之子, 这一生最美的祝福, 一生敬拜你, 为我而来, 你是配的, 坐在宝座上圣洁羔羊, 想起你, 最美的礼物, 神羔羊配得) — **les 91 calques publiés sont tous certifiés et tous complets**, la file est vide et le restera : il n'y a plus de page à certifier qui ait un calque · étiquettes 3602 → **3712**, cadres 91 · banc Playwright **365 tests**, tous verts · un mode D entier retrouvé à l'audit sur 这一生最美的祝福 (la rangée d'intro Gmaj7 · D/A · Gmaj7, jamais isolée par le découpage) |

## Journal

### Itération 0 — mise en place
Découpage en rangées opérationnel sur les deux gravures
(`segment.py`, découpage adaptatif). Classification non résolue : la
signature des amas dépend de la longueur des noms d'accords et ne se
transpose pas (何等恩典 largeur médiane 29–50 ; 爱赢了 88–90). Pas encore
de vérité terrain, pas encore de matcher.

### Itération 1 — classification par géométrie invariante

Vérité terrain établie à l'œil sur 何等恩典 (18 rangées). Les features
mesurées séparent nettement les trois natures :

| Nature | ratio (largeur amas / hauteur) | run_frac |
|---|---|---|
| chiffres | 0,24–0,32 | 0,036–0,068 |
| paroles | 0,97–1,00 (hanzi carrés) | ~0,020 |
| accords | 1,04–1,92 | 0,009 |

Les seuils de départ étaient très mal placés (`numbers_run_frac` 0,06 alors
que les vraies valeurs vont de 0,036 à 0,068 ; `lyric_ratio_min` 0,55 qui
happait des rangées de chiffres). Remplacés par les valeurs mesurées, dans
`classifier.json`.

**Résultat.** 何等恩典 classé **18/18** contre la vérité terrain. Rangées
d'accords désormais trouvées sur 4 des 7 chants du jeu — mais uniquement
sur la gravure aérée (齐来赞美 6, 主的喜乐是我力量 4, 我心坚定与你 5).

**Ce qui résiste.** La gravure serrée échoue toujours : 爱赢了 donne
**0 rangée d'accords** et 25 rangées « ? », 献上尊荣 n'en donne qu'une.
Le cas piège 你们要赞美耶和华 (sans accords imprimés) est passé de 4
fausses rangées à 1 — mieux, mais toujours un faux positif.

**Prochaine itération.** Établir la vérité terrain sur 爱赢了 (lecture à
l'œil des rangées) et comprendre pourquoi ses rangées d'accords tombent en
« ? » : soit le ratio sort de la fourchette, soit `chord_max_height_frac`
(0,85) est trop strict quand la rangée de chiffres est basse.

### Itération 1b — contrôle visuel ajouté, cause de l'échec identifiée

Ajout de `debug-render.py --sheet` → `debug/_planche.png`, et du contrôle
visuel comme étape obligatoire de la boucle (voir ci-dessus).

La planche a immédiatement donné ce que les chiffres cachaient. Section A :
23 rangées déclarées accords, quasiment toutes justes — la précision est
bonne. Section B : parmi les 14 candidates, **six vraies rangées d'accords
manquées** (`Emaj7 Amaj7 Emaj7`, `B7 B7 Emaj7`, `D F#m E D A F#m E`,
`F#m D A/C# Bm7 D/E A`, `Asus4 A D.S. Asus4 A Dmaj9 Esus4`,
`F C/E Dm Gm Bb/C`).

**Cause unique, et elle est bête.** Leurs `ratio` valent 1,93 · 18,72 ·
2,35 · 3,07. Ces rangées portent des **arcs de liaison** qui traversent la
bande d'accords. L'arc produit un long segment continu d'encre : le test
`chord_max_run_frac` (0,015), censé détecter l'absence de ligature, rejette
donc la rangée. Et l'arc soude les amas entre eux, d'où le ratio qui
explose.

Autrement dit : **je testais l'absence de ligature, mais un arc de liaison
ressemble à une ligature.** C'est ce qui fait échouer toute la gravure
serrée. Correctif à tenter : mesurer l'épaisseur du trait (une ligature est
épaisse et horizontale, un arc est fin et courbe), ou ignorer les segments
de 1 à 2 pixels d'épaisseur dans le calcul de `run_frac`.

### Itération 2 — les arcs de liaison filtrés par l'épaisseur

Correctif appliqué (`segment.thicken`) : ne mesurer que l'encre présente sur
3 lignes consécutives. Un arc de liaison est fin (1-2 px), une ligature de
croches est épaisse — filtrer sur l'épaisseur règle les deux symptômes d'un
coup, le faux `run_frac` et la soudure des étiquettes. Écart de fusion des
amas porté de 10 à 14, calé contre la vérité terrain (8/9 rangées au bon
compte, contre 2/9 à écart 10).

**Gains.** 爱赢了 passe de 0 à 2 rangées d'accords, 献上尊荣 de 1 à 2,
我心坚定与你 de 5 à 7, 主的喜乐是我力量 de 4 à 5. 何等恩典 reste à 18/18 :
pas de régression. Toutes les rangées d'accords détectées portent maintenant
170 étiquettes contre 120.

**Ce que la planche a montré et que les chiffres cachaient.** B passe de 14 à
8 candidates ratées — vrai progrès. Mais A monte de 23 à 29 et contient un
**faux positif franc** : la rangée `♩=146 赞美之泉《从心合一》(2013)` de
齐来赞美, qui est une ligne de métadonnées. On y écrirait des accords
par-dessus le titre de l'album. Un compte global en hausse aurait fait passer
ça pour une amélioration nette.

Quatre vraies rangées restent manquées, dont `Dmaj9 E C#m7 F#m7` et
`Asus4 A D.S. Asus4 A Dmaj9 Esus4` sur 爱赢了 — leurs ratios (2,26 et 3,03)
sortent des fourchettes.

**Prochaine itération.** Écarter les rangées de métadonnées : elles sont
au-dessus du premier système et contiennent des hanzi. Un test « la rangée
contient-elle des caractères CJK ? » les élimine sans toucher aux vraies
rangées d'accords, qui sont en caractères latins uniquement.

### Itération 3 — tentative sur les métadonnées, résultat négatif

Test envisagé : une rangée de métadonnées contient des hanzi (amas carrés et
denses), une vraie rangée d'accords est en caractères latins seulement.
Mesuré sur les deux faux positifs connus :

| Rangée | amas carrés denses |
|---|---|
| 你们要赞美耶和华 y=17 (métadonnées) | **60 %** — détectable |
| 齐来赞美 y=92 (métadonnées) | **0 %** — non détectable |
| rangées d'accords réelles | 0 à 20 % |

Le test n'attrape que la moitié des cas. Sur `齐来赞美 y=92`, le symbole ♩
gonfle la hauteur de la rangée, si bien que les hanzi n'y sont plus carrés
relativement à elle. Seuil non retenu : le faire passer demanderait de le
caler sur ce cas précis, donc de surajuster.

**Piste pour la suite, structurelle plutôt que métrique.** Une rangée
d'accords appartient à un **système** : elle est suivie de chiffres *et* de
paroles. Une rangée de métadonnées est au-dessus du premier système. Vérifier
le triplet complet (accords → chiffres → paroles) plutôt que la seule paire
devrait écarter les deux cas sans réglage.

### Itération 4 — l'intro manquante, et l'invariant de mise en page

Signalé à l'usage : sur 何等恩典 transposé en A, les six systèmes suivaient
mais **la ligne d'intro restait en G, C, G**. Diagnostic : sa rangée
musicale est faite de barres obliques (`// // //`), dont le ratio vaut 0,59
— juste au-dessus de `numbers_ratio_max` (0,50). Elle n'était donc pas
reconnue comme rangée musicale, et les accords au-dessus n'étaient jamais
promus. Seuil porté à **0,65** : les obliques sont plus larges que des
chiffres mais plus étroites que des hanzi (0,85+), la marge tient.

**Gains.** Intro détectée. 爱赢了 passe de 2 à 5 rangées (22 → 40
étiquettes), 何等恩典 de 6 à 7 (43 → 46), toujours 18/18.

**Régression vue sur la planche.** Le seuil relevé a fait apparaître deux
nouveaux faux positifs de métadonnées, en plus de celui déjà connu :
`赞美之泉《赞美中信心不断升起》(2022)` et `♩=66 Let love win (2012, IHOP)`.
La précision baissait pendant que le rappel montait — invisible sur un
total.

**Correctif : un invariant de gravure, pas un seuil.** Aucun système ne
commence dans le bandeau de titre. `min_top_frac` (0,08) rejette tout
candidat accords situé dans le haut de page. Résultat exact : les trois
faux positifs retirés (8, 8 et 5 étiquettes), **rien d'autre perdu**,
intro conservée, 18/18 maintenu.

C'est la piste notée à l'itération 3 — structurelle plutôt que métrique —
et elle a tenu, là où le test « la rangée contient-elle des hanzi » avait
échoué.

### Itération 5 — le matcher, par vocabulaire fermé

Quatre itérations avaient poli la classification des rangées ; la colonne
« étiquettes appariées » était restée vide, donc la colonne « chants
résolus » aussi, et un seul chant sur 124 avait un calque (celui dont la
vérité terrain était écrite à la main). C'est cette colonne-là qui bloquait.

**L'idée qui débloque : lire un accord n'est pas de l'OCR.** Le vocabulaire
du chant est déjà connu — il est dans son `.cho`, et il tient en 3 à 13
étiquettes. Choisir parmi dix candidats ne demande aucune bibliothèque de
gabarits constituée à la main : les candidats se *rendent* avec une police
système. `match.py` fait ça, avec deux mesures — corrélation d'une imagette
32×32 et rapport largeur/hauteur (la chasse est très stable : « G/B » vaut
49-50 px sur ses neuf occurrences, « Dsus4 » 75-77).

Mesuré contre la vérité terrain de 何等恩典 : **45/46** en Helvetica Neue.
Les erreurs restantes sont des sosies de même chasse (`A/C#` contre `G/D`).

**Le score sert d'oracle, et l'écart est franc.** Vraies étiquettes : jamais
sous **+0,16**. Amas parasites (arcs de liaison, crochets de reprise, D.S.,
segno, 【Chorus】) : jamais au-dessus de **−0,04**. Seuil posé au milieu du
vide, à +0,10. Conséquence immédiate et non cherchée : le faux positif de
爱赢了 y=1099 — une bande d'arcs et de petits chiffres d'annotation, prise
pour une rangée d'accords — voit **ses 17 amas rejetés d'un bloc**. Le
matcher corrige de lui-même une erreur que le classifieur ne sait pas
éviter, et il ferait de même pour les crochets de reprise qui faussaient le
compte d'étiquettes de 爱赢了 y=1315.

**Ce que la planche de lecture a montré et que les compteurs cachaient.**
Sur 167 amas du jeu de contrôle, 108 sont retenus — mais **11 sont mal lus
et retenus quand même**, avec des erreurs systématiques : `D/F#` lu `E/G#`
sur toute une partition, `Dmaj9` lu `Asus4` sur les trois rangées de 爱赢了,
`F♯m` lu `C#m`. Ce mode d'erreur est nouveau et c'est le pire des trois :
une étiquette rejetée ne fait rien, une étiquette mal lue **écrit un faux
accord sur la partition**. Aucun compteur ne le voit, parce que fermer le
vocabulaire rend la seconde condition de l'oracle — « l'accord lu appartient
au vocabulaire du `.cho` » — vraie par construction. D'où le mode C ajouté
au protocole.

**Deux résultats négatifs, notés pour ne pas les refaire.**

1. *Déduire la tonalité imprimée en essayant les 12 transpositions.* Les
   32 partitions gravées dans une autre tonalité que leur `.cho` auraient
   été traitées sans intervention. Mais le score n'est pas comparable d'un
   jeu de gabarits à l'autre : sur 何等恩典 le maximum tombe à +10 demi-tons.
   Le critère « meilleure marge entre premier et second » échoue pareil
   (+10 encore). Une transposition fausse produit un vocabulaire *plus
   séparable*, pas moins.
2. *Choisir la fonte automatiquement.* Même cause : Times a la **meilleure**
   médiane de score (0,70 contre 0,57) et la **pire** exactitude (34/46
   contre 44/46) — ses empattements, une fois l'imagette écrasée en 32×32,
   corrèlent avec tout. Un ensemble multi-fontes ne fait pas mieux qu'Helvetica
   Neue seul. Fonte fixée, donc, alors que choisir par partition gagnerait
   (Verdana lit 7/9 sur 爱赢了 contre 6/9).

**Sur les 124.** 2547/3554 amas retenus (72 %), 5 partitions entièrement
appariées, 6 sans aucune rangée d'accords détectée. Le chiffre est à lire
comme un plancher : il compte des amas retenus, pas des accords justes.

**Prochaine itération.** Faire baisser le mode C, qui est maintenant le
risque principal. Les trois confusions observées sont des sosies de même
chasse ; la corrélation 32×32 écrase précisément ce qui les sépare (la
lettre initiale). Piste : marquer chaque amas par ses colonnes de gauche
seules — ou comparer à taille réelle plutôt qu'après écrasement. Reste aussi
la typographie à exposants (`A⁽ᵃᵈᵈ²⁾`, `B⁷`, `Emaj⁷`), qui met
主的喜乐是我力量 à 4 lectures justes sur 8 retenues : les gabarits sont
rendus à plat, il faudrait les graver en deux passes.

### Itération 6 — le mode C réduit, et un quatrième mode découvert

Point de départ : le mode C (étiquette mal lue mais gardée) valait **12** sur
le jeu de contrôle, et `build-chords.py` dépendait encore de listes d'accords
écrites à la main.

**Vérité terrain établie sur tout le jeu de contrôle**, ce que LOOP.md
réclamait depuis l'itération 1 : 108 étiquettes et 23 amas parasites, ces
derniers marqués `null` dans `gold/`. C'est ce qui a rendu `evaluate.py`
possible, et donc le mode C mesurable au lieu d'être seulement visible.

**Ce qui fait baisser le mode C.** Les confusions étaient toutes des sosies
de même chasse — `D/F#` lu `E/G#`, `C#m7` lu `F#m7`, `Dmaj9` lu `Asus4`. Ce
qui les sépare est la **lettre de tête**, qui ne pèse qu'un cinquième d'une
imagette écrasée en 32×32. Ajouter la corrélation de la moitié gauche fait
passer la lecture de 111 à 124 étiquettes justes sur 144.

Mais **le même terme fait remonter les amas parasites au-dessus du seuil** :
l'intervalle vide qui les séparait des vraies étiquettes se referme (justes
≥ −0,28 contre parasites ≤ +0,47). D'où la séparation des deux décisions :
la moitié gauche dit *quel* accord, la corrélation pleine seule dit si on y
croit. Un amas parasite a lui aussi une moitié gauche qui ressemble à
quelque chose ; il n'a pas de corrélation pleine.

Ajoutées aussi les gravures à exposants (`A(add2)`, `B⁷`, `Emaj⁷`), qui
faisaient chuter 主的喜乐是我力量 : 3 lectures justes → 8.

**Le score n'est pas un indicateur de justesse — l'accord des fontes en est
un.** Sur 全然向你, trois `Bm` lus `Em` notaient +0,68 à +0,74, aussi haut
que les lectures justes : aucun seuil ne pouvait les écarter. En revanche
les fontes se contredisent exactement là où la lecture se trompe. Mesuré sur
huit partitions : les étiquettes unanimes sont justes 68 fois sur 68, et
toutes les erreurs sont chez les divergentes. Une étiquette n'est donc
publiée que **sûre et unanime**. Résultat : **mode C à 0**, parasites à 0,
au prix de la couverture (95 → 85 étiquettes justes retenues).

**Le quatrième mode, et c'est l'utilisateur qui l'a fait apparaître.** Sa
proposition : rendre le chant transposé et regarder si tous les accords
changent. C'est ce que fait `compare-render.py`, et ça a immédiatement
montré ce qu'aucune métrique ne voyait — une **rangée entièrement manquée**
n'est dans aucun dénominateur, donc un chant peut afficher « 19/19
étiquettes, 100 % » et avoir deux systèmes entiers jamais détectés. C'était
le cas de 全然向你. Transposé, il aurait affiché quatre rangées dans
l'ancienne tonalité à côté de cinq dans la nouvelle : **une page dans deux
tonalités, pire que pas de calque du tout.**

Le même contrôle a disqualifié 爱赢了, publié depuis la vérité terrain — la
vérité terrain n'immunise pas, puisqu'elle ne couvre que les rangées que le
classifieur avait trouvées. D'où le verrou de complétude, qui vaut pour les
deux voies de publication : aucune rangée candidate ne doit rester non lue.

**Résultat net.** `build-chords.py` ne dépend plus de listes écrites à la
main (`match.py` lit ; `gold/` ne sert plus qu'à certifier et à donner la
tonalité imprimée). 21 chants passaient le seuil de couverture avant le
contrôle par transposition ; **3 le passent après**, et ces trois-là sont
justes. Le compte a baissé, la confiance a monté — et c'est le compte
d'avant qui était faux.

**Où est le travail restant, chiffré.** Sur les 121 chants non publiés :
**86 sont bloqués par des rangées candidates non lues** (médiane 2 par
chant) et 35 par une lecture incomplète. Le goulot est donc revenu à la
classification des rangées — le mode B des itérations 1 à 4 — mais avec
cette fois une conséquence produit nette, et un contrôle qui la voit.

### Itération 7 — le classifieur propose, le matcher dispose

Cible annoncée à l'itération 6 : les 86 chants bloqués par des rangées
candidates non lues.

**Ce que la planche des orphelines a montré.** 172 rangées sur le corpus,
dont un échantillon de 40 rendu à l'œil : **environ 34 sur 40 sont de vraies
rangées d'accords**. Ce n'était donc pas un problème de cas limites mais un
défaut de rappel massif. Deux tests les rejetaient, et les compteurs disent
lequel : **90 par la hauteur** (`chord_max_height_frac`, « une rangée
d'accords reste fine devant la rangée de chiffres » — faux : la médiane des
rejetées est à 1,29 fois la hauteur des chiffres, parce qu'une rangée de
chiffres sans point d'octave est basse), **60 par le long segment continu**
(`chord_max_run_frac` à 0,015, alors que la médiane des rejetées est 0,023 —
un arc de liaison, un crochet de reprise, un trait de *D.S.* en produisent),
22 par les deux.

**Les deux tests ont été retirés, pas relâchés.** Ils datent d'une époque où
la précision venait du classifieur. Elle vient maintenant du matcher : une
rangée qui n'est pas des accords donne des amas que rien n'apparie. Le
classifieur n'a plus qu'une règle, positionnelle : *la rangée utile qui
précède une rangée de chiffres, hors du bandeau de titre*.

Résultat : rangées orphelines du corpus **172 → 0** par construction,
rangées d'accords +33 %, amas 3554 → 4651. Sur la planche, A passe de 29 à
39 et B de 16 à 6 — et **les six qui restent sont toutes des titres ou des
crédits**, plus une seule vraie ratée.

**Ce que la planche a montré et que le compteur ne dit pas** : deux rangées
de **paroles** sont maintenant déclarées accords (『赐我 气息…』 et
『我们要赞美耶和华…』), plus une ligne de métadonnées de 献上尊荣 qui passe
tout juste sous `min_top_frac`. Elles ne peuvent pas salir la partition — le
matcher n'apparie aucun hanzi — mais elles **bloquent la publication**,
puisqu'une rangée non lue disqualifie le chant. Le compromis est donc réel
et il fallait le nommer.

**Calibration de chasse, le seul gain de lecture de l'itération.** En
décomposant le score, la corrélation des lectures justes rejetées est bonne
(médiane +0,68 sur 我心坚定与你) mais la **pénalité de chasse** leur retire
0,20 point : le gabarit y est 1,14 fois plus large que le scan. C'est un
facteur *global à la page* — les gravures ne sont pas toutes aussi étroites
— donc estimable sur les propres étiquettes de la partition, à la médiane
des écarts. Lecture 85 → 89 sur le jeu de contrôle, corpus 44 % → 50 %,
sans un seul faux ni parasite en plus. 齐来赞美 devient complet.

**Quatre pistes mesurées et abandonnées**, pour ne pas les refaire :

1. *Baisser `MIN_SCORE`* — de +0,28 à 0,00 ne gagne que 6 étiquettes et
   ramène 3 parasites. Le seuil n'est pas le goulot.
2. *Seuil relatif à la partition* (le score médian va de +0,56 à −0,53 d'une
   page à l'autre, donc l'idée était tentante) — 85 → 88 étiquettes, mais
   une mal lue et un parasite reviennent.
3. *Choisir la fonte de référence par partition*, cette fois avec un critère
   qui vise directement l'objectif (le nombre d'étiquettes publiables) et
   non plus le score médian de l'itération 5 — **101 → 102 étiquettes**, et
   un parasite. La fonte n'est pas le goulot non plus.
4. *Filtrer les marques par leur remplissage vertical* — l'amas d'un crochet
   ou d'un arc n'occupe que 38 % de la hauteur de rangée, contre 100 % pour
   une étiquette ; à 0,5 le test désigne 15 parasites sur 23 **sans perdre
   une seule étiquette**. Bon signal, mais inutile ici : le simuler sur le
   corpus ne fait passer que 2 chants au lieu de 3, parce que 108 chants ont
   encore 6 amas illisibles ou plus. Ce ne sont pas les marques qui bloquent.

**Le compte de calques publiés ne bouge pas : 3.** Il faut le dire
franchement. La lecture progresse (44 → 50 % du corpus) mais la publication
est tout-ou-rien par partition, et 50 % de lecture ne publie rien. Le vrai
état des lieux : 1 chant entièrement lu, 1 à un ou deux amas près, 7 à cinq
près, **89 à plus de dix**.

**Prochaine itération — la question à trancher est de produit, pas de
technique.** Le tout-ou-rien vient de l'itération 6 et il est juste : une
page à moitié transposée ment. Mais il rend le progrès invisible jusqu'au
dernier amas. Deux sorties possibles, et c'est à l'utilisateur de choisir :
soit on continue jusqu'à lire des partitions entières, soit le client
**signale visuellement les accords non convertis** (grisés, ou barrés) et
publie alors les calques partiels, ce qui rendrait exploitables les dizaines
de chants lus à 80-90 %.

### Itération 8 — le verrou se vérifiait lui-même

Demande de l'utilisateur : ce qui doit suivre la transposition, c'est **les
accords, le libellé « 1=X » et le pinyin**. Et : *zéro erreur*. Plus :
vérifier dans le vrai navigateur.

**Le navigateur a montré deux défauts que les planches Python ne pouvaient
pas voir**, puisqu'elles travaillent sur l'image d'origine et non sur la
page. En thème sombre le scan passe par `dark:invert`, donc son papier blanc
devient du noir **pur**, alors que le masque était en `neutral-900` :
32 723 pixels de pavé gris autour des accords. Et le masque faisait
exactement la largeur de l'amas, laissant dépasser le crénage du glyphe
d'origine. Les deux corrigés dans `JianpuSheet.tsx`.

**Le libellé « 1=X » manquait sur 2 des 3 chants publiés.** Transposés, ils
affichaient donc leurs accords dans la nouvelle tonalité sous une tonalité
imprimée restée dans l'ancienne. Le localiser automatiquement a été tenté et
**abandonné** : on sait déjà ce qui est écrit (la tonalité du `.cho`), il n'y
a qu'à trouver où — mais la corrélation ne dépasse pas +0,49 sur le corpus,
et le vrai libellé de 何等恩典 n'entre même pas dans les quatre premiers
candidats, derrière des blocs de crédits en hanzi. Il se mesure donc à l'œil,
une fois par partition, et **son absence interdit la publication**.

**Le vrai enseignement de l'itération.** 齐来赞美 était publié en mélangeant
deux tonalités, et *trois* contrôles successifs ne l'avaient pas vu :

1. une rangée d'accords **courts** (« C », « F ») a un ratio de 0,48 à 0,54,
   sous `numbers_ratio_max` — elle est donc typée `numbers`, invisible à la
   promotion **et** au comptage des orphelines ;
2. corrigé par une règle de hauteur (deux rangées de chiffres qui se
   suivent, la première nettement plus basse = des accords), il restait
   encore une rangée manquée — cette fois parce que la rangée de *chiffres*
   qui la suivait était elle-même mal typée, ce qui cassait l'adjacence.

La cause commune est structurelle et vaut d'être nommée : **le verrou de
complétude était construit sur la classification qu'il était censé
vérifier.** Il ne pouvait pas voir une rangée que le classifieur avait
ratée, puisqu'il ne regardait que ce que le classifieur lui montrait.

**Le verrou est donc refait sans le classifieur.** `stray_chords` apparie
**tous** les amas de la page au vocabulaire du `.cho` ; tout amas qui
ressemble à un accord du chant et n'est pas couvert par le calque interdit
la publication. C'est indépendant du typage des rangées, et ça repose sur la
seule chose que quatre itérations ont solidement établie — les chiffres et
les hanzi n'apparient rien.

Verdict immédiat : **2 des 3 chants publiés étaient faux** (`Bb@y293` sur
齐来赞美, dix accords hors calque sur 能不能). Il en reste **un**, 何等恩典,
vérifié dans Chrome en clair et en sombre, transposé de G en A : les 46
accords et le libellé changent, rien ne subsiste.

Le compte baisse encore, de 3 à 1. C'est le bon sens de variation : les
deux qui partent étaient des erreurs en production.

**Pinyin — exploré, pas livré.** La découpe par caractère est fiable (chaque
hanzi isolé, la ponctuation aussi, largeur ≈ hauteur de rangée) et les
rangées de l'image sont un **flux continu** du texte du `.cho`. Mais sur les
124 partitions le compte ne tombe juste que 7 fois : le `.cho` écrit le chant
en entier, la gravure ne porte les paroles qu'une fois sous la musique. Ce
n'est donc pas un problème de segmentation mais d'alignement de sections.
Piste, dans l'esprit de ce qui a marché pour les accords : apparier **chaque
rangée séparément** en cherchant sa sous-chaîne dans le `.cho` — une rangée
de vingt hanzi ne peut pas s'apparier deux fois par hasard — pour qu'une
rangée non retrouvée ne bloque qu'elle-même.

### Itération 9 — ce que le verrou automatique ne peut pas voir

Le contrôle `stray_chords` étant indépendant du classifieur, il sert aussi
de **mesure** : sur les 124 partitions, **20 n'ont aucun accord hors
calque** — le classifieur y trouve tout, et ce qui bloque est uniquement la
lecture.

**Trois pistes mesurées.**

1. *Écarter les marques par leur remplissage vertical* (crochets, arcs) —
   reprise de l'idée de l'itération 7 maintenant que le verrou indépendant
   la rendrait sûre. Zéro chant débloqué : les amas non lus de ces 20
   partitions remplissent la rangée, ce sont bien des étiquettes.
2. *Élargir le vocabulaire* — la planche des illisibles montre que le `.cho`
   **n'est pas un sur-ensemble de ce qui est gravé** : la partition porte
   `F#dim`, `Em/D`, `D/C`, `Am/G`, `A/B` que la transcription simplifie.
   Ajouter toutes les basses de la gamme et les douze diminués fait passer
   le vocabulaire de 13 à 84 candidats — et la lecture **tombe de 95 à 76**
   étiquettes justes, avec deux mauvaises lectures. C'est la *petitesse* du
   vocabulaire qui fait la force du matcher. Remplacé par un supplément
   ciblé, `extra_chords` dans `gold/`, lu à l'œil.
3. *Corriger seulement les amas ratés* — plutôt que retranscrire une
   partition entière, `corrections` dans `gold/` comble les trous, indexé
   par la position de l'amas. Trois coups d'œil au lieu d'une transcription.

**Et l'échec qui compte.** 到各山岭去传扬, publié par cette voie, s'est
révélé faux au contrôle navigateur : deux accords du deuxième système
restaient en G sur une page en A. Sa rangée d'accords est **gravée à deux
hauteurs** — le `G` de gauche plus haut que les `G  D/F#` de droite — donc
coupée en deux bandes, dont l'une fusionne avec les chiffres. Illisible,
et par conséquent **invisible à `stray_chords`**.

C'est la limite de fond, et elle vaut d'être écrite : **le contrôle
automatique hérite de la faiblesse du matcher.** Il ne peut pas signaler un
accord qu'il ne sait pas lire. Il pré-filtre, il ne certifie pas. Le même
raisonnement qu'à l'itération 8, un cran plus bas : un instrument ne peut
pas mesurer sa propre panne.

**Conséquence, et c'est la vraie livraison de l'itération.** Le champ
`verified` devient obligatoire dans `gold/` : il porte la phrase décrivant
ce qui a été regardé dans le navigateur, transposition comprise. Aucun
calque ne part sans. Les trois chants publiés par la seule machine depuis
l'itération 6 étaient tous faux (齐来赞美 mélangeait F et G, 能不能 avait dix
accords hors calque, 到各山岭去传扬 deux). Il en reste **un**, 何等恩典.

**Le critère d'arrêt de la boucle est atteint** : trois itérations
consécutives sans progression du nombre de calques justes. Ce qui reste
n'est pas un problème d'algorithme mais de volume de vérification humaine —
et la question de produit posée à l'itération 7 (tout-ou-rien, ou signaler
les accords non convertis) n'a toujours pas été tranchée.

### Après la boucle — publier l'incertitude plutôt que la cacher

Le critère d'arrêt étant atteint, la sortie n'est pas algorithmique mais de
produit. Des deux options posées à l'itération 9, c'est la seconde qui est
retenue : **le client dit ce qu'il n'a pas su convertir.**

`chords.json` porte désormais `complete: false` sur les calques non
certifiés. Le client affiche alors un bandeau — « Seuls les accords en bleu
ont été transposés, les autres sont ceux d'origine (F), comme l'indication
1=F en haut de page » — et **met les accords réécrits en bleu**. Le musicien
voit d'un coup d'œil où il peut se fier au calque et où il doit lire la
tonalité imprimée.

**50 partitions sur 124 ont un calque**, contre 1. Une seule est certifiée
(何等恩典, vérifiée à l'œil sur la page transposée) et s'affiche sans
bandeau ni couleur ; les 49 autres sont marquées. Le plancher de publication
est fixé à 60 % d'amas lus : en dessous, la page resterait presque
entièrement dans sa tonalité d'origine et le marquage ferait plus de bruit
que de service.

Deux conséquences à garder en tête. `stray_chords` n'est **plus appelé
nulle part** : le verrou tout-ou-rien de l'itération 8 n'a plus d'objet
puisque l'incomplétude est publiée et dite ; la fonction reste dans
`build-chords.py` comme documentation du contrôle, mais la mesure « N
partitions sans accord hors calque » de l'itération 9 n'est plus branchée.
Et le plancher de 60 % se calcule sur les amas **détectés**, pas sur la
page : 能不能 affiche « 3/3 étiquettes » alors que sa page porte une
dizaine d'accords que le classifieur ne voit pas. Le bandeau rend ça
honnête — seuls les accords en bleu sont garantis — mais le chiffre de
couverture peut flatter.

Ce n'est pas un renoncement au « zéro erreur » mais son application : une
erreur, c'est **affirmer** faussement. Montrer une conversion partielle en
disant qu'elle est partielle n'affirme rien de faux. Ce qui reste interdit,
et le reste, c'est de publier une page qui a l'air entièrement convertie
sans l'être — c'est précisément ce que faisaient les trois calques retirés
aux itérations 8 et 9.

La certification garde tout son sens : elle se gagne partition par
partition, en lisant les rangées ratées et en regardant la page transposée
dans le navigateur. Chaque chant certifié perd son bandeau.

### Itération 10 — l'automate propose, l'œil dispose

Reprise de la boucle sur demande : viser des calques fiables à 100 %, en
vérifiant « par tous les moyens », navigateur et captures compris.

**Le repêchage automatique, essayé et enterré.** L'état des lieux montrait
que le matcher savait déjà lire des accords que le classifieur n'avait
jamais mis en rangée (les 10 « hors calque » de 能不能). Les publier
directement a été tenté avec trois garde-fous successifs, et chacun a été
percé par le contrôle visuel :

1. *Sans garde* : un 6 de mélodie avec son octave lu « C » (+0,30) et
   réécrit « C# » **par-dessus la note**. Les chiffres apparient.
2. *Adjacence à une rangée de chiffres* : casse sur les pages où la mélodie
   est typée `?` (ligatures épaisses → ratio haut), soit précisément les
   pages à repêcher.
3. *Triple garde (score ≥ +0,42 · ≥ 2 par rangée · rangée ≤ 1,5 ×
   hauteur d'étiquette)* : élimine 100 % des faux connus… sauf un « C » à
   +0,42 dans une rangée qui n'en contient pas (明亮晨星), vu à l'œil seul.

La moisson de la planche des candidats vaut d'être gravée : le libellé
« 1=D » se lit « D » à **+0,70** ; un G/B se lit « Bm » à **+0,73, jury
unanime** ; des paroles anglaises donnent F#m à +0,39, des hanzi F à
+0,47, des chiffres G à +0,49. **« Les chiffres et les hanzi n'apparient
rien » — vrai dans les rangées calibrées, faux à l'échelle de la page.**
Ni score, ni unanimité, ni géométrie ne séparent : seule la structure
d'une rangée déjà classée le faisait, et hors de ces rangées il n'y a que
l'œil.

**Le circuit retenu.** `propose-extra.py` applique le triple garde comme
*pré-filtre de volume* et émet un zoom par étiquette (l'amas encadré, la
lecture à côté). Les zooms sont lus un à un ; les approuvés sont recopiés
dans `gold/<slug>.json` sous `extra_labels`, et `build-chords.py` publie
cette liste gelée — rien d'automatique n'atteint plus le calque. Résultat
de la première passe : **139 zooms lus, 139 justes**, plus 12 étiquettes
isolées ou illisibles certifiées à la main (dont `(C/G)` entre
parenthèses, `D/G`, `D/C`, et le `F Bb C F` de 齐来赞美 que l'automate
n'a jamais su lire). 1199 → 1344 étiquettes publiées, 23 chants
améliorés, sans une seule écriture non vue.

**La vérification navigateur est outillée** (`puppeteer-core` + Chrome
headless, clair et sombre, tonalité transposée par l'URL) — et sa première
sortie a immédiatement montré deux défauts qu'aucun contrôle Python ne
pouvait voir sur 能不能 :

- une **parenthèse fermante orpheline** à côté du `(D/A)` réécrit — la
  `）` était un amas séparé, hors du masque ;
- **tout un système resté dans l'ancienne tonalité** : sa rangée d'accords
  est *fusionnée* dans la rangée de mélodie (h = 144, typée `numbers`),
  invisible au classifieur, au matcher, à `stray_chords` **et** à
  `compare-render`, qui ne bande pas les rangées `numbers`. C'est le mode
  de 到各山岭去传扬, pris ici en flagrant délit — par la capture seule.

Les deux corrigés (masque élargi ; bande fusionnée découpée à la main,
cinq accords lus à l'œil), `compare-render` bande maintenant toute rangée
où le calque publie, et `overlay.py` transpose les accords entre
parenthèses comme le client sait déjà le faire.

**能不能 est certifié** — deuxième calque après 何等恩典 : page relue en
capture Chrome dans les deux thèmes, transposée G→A, 21 étiquettes toutes
retournées, `1=A`, rien d'ancien. Le compte certifié passe à **2/124**,
et la voie est répétable : zooms → gold → captures → `verified`.

### Itération 11 — un troisième certifié, et un lot retiré à temps

**齐来赞美 est certifié** (3ᵉ) : transposition F→G propre sur les 7 bandes
du compare, captures Chrome clair/sombre, 20 accords tous retournés,
voltas et ligne d'album intacts. **到各山岭去传扬 est complété** — le `G`
et le `D/F#` de sa rangée gravée à deux hauteurs (la cause de sa
dépublication à l'itération 9) sont disséqués à la main et au calque.

**Deux questions de produit découvertes, à trancher avant de certifier
les chants concernés :**

1. *Le titre qui annonce la tonalité.* 到各山岭去传扬 imprime
   « （G调） » dans son titre : transposée en A, la page garde un titre
   qui dit G. Masquer la mention comme on masque « 1=X », ou l'accepter
   comme information d'édition ?
2. *Les pages à capo.* 十架的爱 imprime `1=F` en tête… et ses accords
   gravés sont des formes de ré (D/F#, G, Bm — vérifiés au zoom), .cho en
   D : arrangement guitare capo 3. Réécrire « 1=A » quand on joue en A
   serait faux (le A est une forme, pas la hauteur sonnante). Quelle
   sémantique pour le libellé sur ces pages ?

**Le lot des cadres 1=X, tenté en série et retiré.** 44 cadres transcrits
à l'œil sur planches quadrillées, cohérence lettre imprimée ↔
`printedKey` vérifiée (44/44 — seule exception : 十架的爱, le cas capo
ci-dessus). Mais le rendu de contrôle — `overlay.py`, qui dessine
désormais le libellé comme le client — a montré **plus d'une douzaine de
cadres faux** : « 4/4 » rogné (la fraction était plus proche que la
grille ne le laissait lire), « 1= » d'origine qui dépasse à gauche,
et des cadres posés sur la mauvaise ligne. La transcription de
coordonnées sur grille ne tient pas à cette échelle. Lot entier mis de
côté (stash `keylabels-brouillon-44-cadres`), rien de publié — c'est le
même réflexe qu'aux itérations 8 et 9 : le compte qui monte n'a aucune
valeur si le contrôle ne passe pas.

**Piste pour le prochain lot** : mesurer les cadres automatiquement —
dans la bande du libellé, la fraction 4/4 se distingue par sa hauteur
(double de celle des lettres) ; un bbox des amas *hors fraction* donnerait
des cadres exacts, à valider ensuite sur le rendu fidèle, page par page.

### Itération 12 — les cadres 1=X mesurés par le vote du matcher

La piste de l'itération 11 tenait, à condition d'y ajouter ce que la
boucle sait déjà faire : **voter avec ce qu'on connaît**. La lettre du
libellé est le `printedKey` ; `measure-keylabel.py` confronte donc l'amas
d'après le « = » à la lettre attendue *contre* des chiffres (la ligne de
tempo « ♩=NN », même silhouette, perd ce vote), exige que le premier amas
ressemble à « 1= » (sans quoi une rangée d'accords contenant la lettre
gagnerait — vu à +0,77), et rend un gabarit « 1=X » entier pour les
gravures fusionnées. La fraction s'exclut par sa hauteur, comme prévu.

Résultat : **24 cadres justes sur 46** — corr > 0 et boîte étroite
valent acceptation, chaque zoom relu à l'œil, puis le rendu fidèle
(overlay transposé d'un demi-ton) vérifié un à un : 4/4 et notes
d'édition intacts partout. Un seul ajustement (和散那 : le F d'origine
débordait de 12 px, plus une descente de scan sous la boîte). Contrôle
navigateur sur 爱我愿意 en E. Les 22 échecs sont tous *expliqués* :
libellé fusionné avec la ligne de tempo sur la même bande, hymnaire
gravé « F=1 » (ordre inversé !), pages à photo, et le cas capo 十架的爱
— traitement individuel à venir.

Au passage, le tri des PDF des 63 chants sans 简谱 (détection de
portées + planches relues) a montré que « 哦 十字架.pdf » était un 简谱
mal rangé : il rejoint le corpus, qui passe à **125**. 49 chants n'ont
qu'un 五线谱, 13 n'ont rien — liste transmise pour obtenir les 简谱.

### Itération 13 — deux certifiés, et trois pièges nommés

**爱我愿意** (4ᵉ) et **不停赞美** (5ᵉ) certifiés. Chacun a livré un piège.

**1. Le compare ment par omission, la capture navigateur non.** Sur
不停赞美 les six amas non couverts étaient tous des arcs de liaison, et
`compare-render` montrait sept bandes toutes transposées : tout disait
« complet ». La capture navigateur a montré un système entier — `Em A D
G` — **en noir au milieu des bleus**, resté en D. Sa rangée est typée
`numbers` (elle contient les accords *et* des ligatures, h=61 contre 65
pour la vraie rangée de chiffres : la règle `short_row_frac` de
l'itération 8 ne se déclenche pas), donc invisible au classifieur, au
matcher **et** aux bandes du compare. La couleur du calque partiel est
devenue un instrument de contrôle : *ce qui n'est pas bleu n'est pas
converti*, et l'œil le voit d'un coup sur la page entière.

**2. Le haut d'une rangée n'est pas le haut de ses lettres.** Posées à
`y=888` (le `top` de la rangée), les quatre étiquettes ajoutées ont
d'abord laissé un liseré, puis — en allongeant la boîte — **mangé le haut
des chiffres**. Les lettres vivent en réalité à 902–930 : le reste de la
bande, ce sont les ligatures. Il faut mesurer le profil d'encre *des
colonnes de l'amas*, pas hériter des bornes de la rangée. Corrigé, la
comparaison original/rendu est propre au pixel.

**3. Les accords à alternative ne se transposent pas.** 你坐着为王 grave
`F(或Am)`, `Bb(或Gm)`, `C(或Am)` — « 或 » = « ou ». Le modèle « une
étiquette = un accord » ne sait pas les rendre : `transposeChord` sur
« F(或Am) » ne transposerait que le F. Les découper échoue aussi (l'arc
de liaison soude, le hanzi colle aux lettres). Le chant reste **partiel**,
et c'est le bon résultat : le bandeau dit exactement ce qui est vrai.
À trancher plus tard, avec la question du titre « （G调） » et le cas capo.

### Itération 14 — le piège de l'itération 13, outillé

Plutôt que d'attendre la capture navigateur pour découvrir chaque rangée
mêlée, `propose-extra.py` ne les saute plus : la borne de hauteur qui
écartait les rangées « trop hautes pour être des accords » sert
maintenant à *changer de méthode* — dans une rangée haute, chaque
étiquette est cadrée sur **le bloc d'encre supérieur de ses propres
colonnes**. C'est la leçon 2 de l'itération 13 transformée en règle.

32 candidates sur le corpus, toutes relues : 23 gardées, et trois motifs
d'écart nommés au passage — un doublon (l'amas déjà publié n'est pas
reconnu comme couvert quand sa boîte a été recalée), un cadre vide sur
爱赢了 (le texte est *sous* la boîte), des boîtes décalées sur 永活盼望.
Les trois se voient d'un coup d'œil sur le zoom ; aucun n'aurait été
détecté par un score.

**全新的你 certifié** (6ᵉ). Il a fallu huit étiquettes de plus, mesurées à
la main, dont deux `C/G` **soudés à un arc de liaison** : l'amas fait 226
px de large et englobe l'arc, alors que la lettre n'en fait que 55. Cadrer
sur l'amas aurait effacé l'arc — c'est-à-dire de la musique. Cadrer sur le
bloc supérieur des colonnes de la lettre seule règle les deux à la fois.
Et un `G` de fin de première ligne, invisible au matcher, que seule la
couleur du calque partiel a dénoncé sur la capture : *ce qui n'est pas
bleu n'est pas converti*.

### Itération 15 — la page entière relue sans navigateur

Le contrôle décisif des itérations 13 et 14 était la **capture
navigateur** : elle seule montrait la page en entier, donc elle seule
voyait les rangées jamais détectées. Elle coûtait un serveur, Chrome
headless et une manipulation d'URL. `audit-page.py` fait la même chose en
Python : la page est découpée en tranches de 300 px qui se recouvrent,
chacune posée sous la même tranche du rendu fidèle transposé, cadres de
contrôle activés. **Un accord sans cadre n'est pas converti** — et
l'alignement vertical des deux tranches donne le mode C par-dessus le
marché.

Trois pages auditées, **trois rangées entières manquées** trouvées, sur
des chants dont les compteurs disaient 79 % et 76 % :

- 是为了爱, y=751 : le segno et 【Chorus】 étirent la bande à 43 px ;
- 是为了爱, y=1737 : « D.S. al Fine » fait de même ;
- 拣选, y=247 : la première rangée de la page, trois amas seulement sur
  1300 px de large.

**Le motif se nomme enfin.** Ce que le classifieur rate, ce ne sont pas
des accords difficiles à lire — ce sont des rangées dont la *silhouette*
n'est pas celle d'une rangée d'accords : trop clairsemée, ou étirée par un
glyphe étranger (segno, 【Chorus】, D.S. al Fine). Les accords eux-mêmes s'y
lisent très bien une fois la bande cadrée à la main. Et aucune métrique ne
les voit, puisqu'une rangée jamais détectée n'entre dans aucun
dénominateur — c'est le mode D, trois fois de suite.

**`propose-extra --all`.** Le pré-filtre par score existe pour limiter le
volume quand on ratisse le corpus ; sur un chant qu'on certifie il devient
une gêne, car il tait précisément les amas que le matcher ne sait pas
lire. Les six accords à basse étrangère de 是为了爱 (Bb/F, Bb/D, C/E, F/C)
se lisent à +0,03 ou moins : invisibles au pré-filtre, évidents au zoom.
`--all` rend tout ce qui n'est pas couvert dans les rangées où le calque
publie déjà.

**把冷漠变成爱 (7ᵉ), 是为了爱 (8ᵉ), 拣选 (9ᵉ) certifiés.** Le premier
attendait sa relecture depuis l'itération 14 ; elle a été refaite
entièrement plutôt que reprise sur parole.

**Deux chants butent sur des questions de produit déjà ouvertes**, et
c'est le bon résultat — ils restent partiels et le bandeau dit vrai :

- 使命 grave `F#m或A` : accord à alternative, comme 你坐着为王
  (itération 13) ;
- 永活盼望 a ses 53 accords couverts et justes, mais son **titre** imprime
  « （D调） », qui reste en D sur une page rendue en D#. Le même chant
  porte aussi « [ 原调Eb。… ] » — et la distinction est nette :
  **« （D调） » décrit cette page-ci et devrait suivre la transposition ;
  « 原调Eb » décrit la source et doit rester tel quel.** C'est la question
  posée à l'itération 11 sur 到各山岭去传扬, désormais posée avec sa
  réponse probable.

**Où en est le corpus** (mesuré, pas estimé) : 125 chants, 50 calques,
9 certifiés. Des 41 calques non certifiés, **19 ont déjà leur cadre 1=X**
— ce sont les moins chers. Les 75 sans calque sont tous sous le plancher
de 60 % : 56 entre 30 et 59 %, 19 sous 30 %, et **2 193 étiquettes y
restent à lire à l'œil**, sans compter les rangées jamais détectées que
seul l'audit révèle.

### Itération 16 — deux correctifs mesurés, deux rejetés, et le vrai goulot nommé

**Le gel d'abord.** Sept des neuf calques certifiés étaient construits par
`match.py` : n'importe quelle retouche du matcher les changeait
silencieusement, et la phrase `verified` — qui dit ce qu'un humain a
regardé — décrivait donc une cible mouvante. `freeze.py` recopie les
étiquettes publiées dans la vérité terrain au moment de la certification.
`chords.json` est identique au bit près avant et après : le gel ne change
rien de ce qui est publié, il le met hors d'atteinte. **Ce qui est
certifié le reste, et le matcher redevient libre d'évoluer** — sans quoi
chaque nouveau certifié rendait plus cher tout progrès sur la lecture.

**Le jeu de test doublé.** Les `chord_rows` sont un échantillon
représentatif : ils contiennent surtout ce que le matcher sait déjà lire,
donc ils ne bougent pas quand on améliore les cas durs. Les `extra_labels`
sont l'inverse — ce sont les étiquettes qu'il a ratées et qu'un humain est
allé chercher au zoom. Boîte *et* accord y sont connus : **232 étiquettes
de test gratuites, biaisées vers les cas durs**. `evaluate.py` y sépare
deux décisions qui n'ont pas le même coût : *identifier* (le bon accord
sort-il en tête ?) et *oser* (passe-t-il le seuil ?).

**L'hypothèse, et sa réfutation.** Les accords à barre oblique sont
mesurablement les plus mauvais — 62 % identifiés et **40 % retenus**,
contre 96 % et 92 % pour le reste des cas durs. La cause se voit à l'œil :
le graveur serre la barre, Helvetica Neue l'aère, et à même hauteur le
gabarit « Bb/F » est 27 % plus large que le scan. `RATIO_WEIGHT` en fait
une demi-unité de pénalité — assez pour couler `G/B`, pourtant **identifié
rang 1 sur 8** et rejeté au seul motif du seuil.

Le correctif — proposer aussi des gabarits à barre resserrée, comme on
propose déjà dièse et bémol — a été balayé de 0,7 à 0,0 : **95 → 94, 97,
93, 93**. Rien qui sorte du bruit. La raison est rétrospectivement
évidente : resserrer la barre profite **autant au mauvais accord qu'au
bon**, `F/A` rétréci reste devant `F/C` rétréci. La pénalité était réelle
et ne décidait de rien.

Seconde hypothèse, tirée des fautes elles-mêmes (`F/C→F/A`, `D/G→D/C`) :
ce qui se trompe est toujours **la basse**, à droite de la barre, alors
que le score pondère la moitié *gauche*. Ajouter une corrélation de la
moitié droite : **209 → 209, 209, 210** pour un FAUX de plus. Rejetée
aussi. Les deux lots sont revenus en arrière, rien de spéculatif n'est
resté dans `match.py`.

**Ce que la mesure a montré à la place, et qui vaut mieux que le
correctif.** Sur les 232 cas durs, **176 des 192 sans barre oblique sont
déjà lus juste et retenus — 92 %**. Ces étiquettes ont pourtant toutes dû
être lues à la main. Ce n'est donc pas que le matcher ne sait pas les
lire : **c'est qu'on ne les lui a jamais présentées.** Le goulot n'est pas
la lecture, c'est la détection de rangées et le cadrage des boîtes — ce
que l'itération 15 avait déjà vu de l'autre bout, avec ses trois rangées
entièrement manquées.

La conséquence pour la suite est nette : le travail à faire n'est pas
d'affiner le matcher mais de **lui donner plus de boîtes serrées à lire**,
en étendant `propose-extra` aux rangées où le calque ne publie rien
encore, avec le cadrage sur le bloc d'encre supérieur des colonnes. La
sécurité reste la même qu'à l'itération 10 : l'automate propose, l'œil
dispose — un zoom relu coûte infiniment moins qu'une tranche d'audit.

### Itération 17 — le garde qui étranglait, et une page à deux tonalités

L'itération 16 avait nommé le goulot : le matcher lit très bien (92 % des
cas durs sans barre oblique) mais **on ne lui présente pas les boîtes**.
La cause tenait en une ligne, et pas celle qu'on croyait.

**`MIN_ROW_MATCHES = 2`.** La règle « au moins deux lectures sûres dans la
rangée » vient du triple garde de l'itération 10, quand les étiquettes
repêchées partaient **directement au calque**. Depuis cette même
itération, rien n'atteint le calque sans un zoom relu : le garde
protégeait d'un risque qui n'existe plus. Ce qu'il faisait encore, c'était
cacher les accords **isolés** — c'est-à-dire exactement les rangées du
mode D, celles qu'on ne trouvait qu'en auditant la page entière.

Levé, à seuil et jury inchangés : **21 propositions sur tout le corpus →
188**, dont 173 correspondent à des étiquettes qu'il avait fallu aller
chercher à la main. Le seuil, lui, a été balayé contre ces mêmes 232
étiquettes : 0,42 rend 75 % du gisement à 92 % de précision ; 0,30 ajoute
11 étiquettes pour 59 zooms ; 0,20, 8 pour 119. On reste à 0,42.

**Deux sources de bruit supprimées.** Le test « déjà couvert » comparait
`(y, x)` à l'exact : il suffisait qu'une boîte ait été recalée — resserrée
sur l'encre, ou cadrée sur le bloc supérieur — pour que l'étiquette déjà
publiée revienne comme si elle manquait. C'est le doublon de l'itération
14, et il faisait pire que perdre du temps : il invitait à publier deux
fois le même accord, l'un sur l'autre. Il teste maintenant le
recouvrement. Le cadre « 1=X » rejoint aussi ce qui est connu. Bilan : 40
propositions brutes → 18, dont 15 vraies étiquettes.

Bon signe au passage : **plus aucune proposition sur les neuf chants
certifiés.** L'audit visuel disait « tout est couvert », l'automate le
recoupe.

**12 étiquettes publiées, et six d'entre elles étaient lues faux** entre
+0,43 et +0,73 (G#m lu C#m, A7 lu Bb, G lu C, Am lu Bm). Relues au zoom
×7. La leçon de l'itération 10 ne s'use pas : le score n'est pas la
vérité.

**La découverte de l'itération : 我心坚定与你 est une page à deux
tonalités.** Le jeu de contrôle le décrit depuis l'itération 0 comme
« aérée, 2 rangées d'accords » — personne n'avait regardé *ce que dit* la
seconde rangée. Elle est en **do majeur** (`C G/B Am`, `F C/E Dm G C
G/B`), posée au-dessus d'une rangée en **la** (`A E/G# F#m`), sur la même
ligne de chiffres, sous un en-tête qui annonce `1=A`. Le format existe
ailleurs : `使命` imprime `[共3张：A、Bb、C调]`, « 3 versions : A, Bb, C ».

Trois conséquences, dont une immédiate :

1. **Ne pas publier la rangée en C.** Transposer ses accords de
   l'intervalle de la page suppose répondu ce qui ne l'est pas — la
   seconde rangée est-elle un jeu d'accords *sonnants* (elle suit alors la
   transposition) ou des *formes* à jouer au capo (elle ne la suit pas) ?
   C'est la question capo de l'itération 11, sous un autre visage.
2. Le calque publié sur ce chant **mélange déjà deux tonalités dans une
   même rangée** : `D→D#` et `Bm→Cm` convertis, `A/C#`, `E`, `E/G#`
   laissés en A. C'est dans la politique de l'itération 9 — le chant est
   marqué partiel, le bandeau ne ment pas, les convertis sont en bleu —
   mais c'est le cas le plus laid rencontré jusqu'ici.
3. **Le modèle « une page = une tonalité » est faux**, et il est câblé
   dans `printedKey`. Aucun chant à deux rangées ne pourra être certifié
   avant que la question soit tranchée.

Les six propositions écartées reviendront à chaque passe : rien ne note
les refus. À faire quand le volume le justifiera, pas avant.

### Itération 18 — les quatre questions de produit, tranchées

Elles traînaient depuis les itérations 11, 13 et 17 et bloquaient des
chants entiers. Décisions de Timothée, appliquées :

| question | décision | effet |
|---|---|---|
| tonalité dans le **titre** | on fait la distinction | `titleKey` implémenté |
| pages à **capo** | traiter comme s'il n'y en avait pas | aucun code — c'est déjà le comportement ; 十架的爱 débloqué |
| accords à **alternative** (`或`) | laisser | ces chants restent partiels, le bandeau dit vrai |
| pages à **deux tonalités** | laisser | seconde rangée non publiée |

**`titleKey`.** Certaines gravures répètent la tonalité dans le titre :
« 永活盼望（李伟版）（D调） ». Transposée, la page affichait ses accords et
son « 1=X » dans la nouvelle tonalité sous un titre resté dans l'ancienne
— l'incohérence à deux tonalités que le calque est censé supprimer. La
distinction retenue est nette et se vérifie sur les deux chants
concernés :

- **« （D调） » décrit *cette page*** → suit la transposition ;
- **« 原调Eb » décrit la *source*** → reste tel quel (永活盼望 porte les
  deux) ;
- **« [共5张：D/E/F/G/A调] » décrit la *collection*** → reste tel quel
  (到各山岭去传扬).

Même mécanisme que `keyLabel` : un cadre mesuré à l'œil dans `gold/`, un
span masqué côté client, et le rendu de contrôle qui suit. Un piège au
passage : `overlay.py` chargeait Times New Roman, qui ne couvre ni les
hanzi ni les parenthèses pleine chasse — le premier rendu affichait
« □D#□ □ ». **Un contrôle illisible ne contrôle rien**, d'où la liste de
fontes CJK.

**永活盼望 (10ᵉ) et 到各山岭去传扬 (11ᵉ) certifiés.** Le premier attendait
depuis l'itération 17 avec ses 53 accords déjà justes, le second depuis
l'itération 11.

**Une question de musique, posée par Timothée, et qui méritait sa
réponse.** Si un chant module — base en G, pont en A — et qu'on monte la
base en A, le pont passe-t-il en B ou reste-t-il en A ? **Il passe en B** :
transposer décale toute la pièce d'un intervalle constant, et une
modulation est une *relation* (« au pont, ça monte d'un ton »), pas une
tonalité absolue. S'il restait en A, le pont se retrouverait dans la même
tonalité que les couplets et la modulation disparaîtrait. C'est déjà ce
que fait le calque, qui applique un seul intervalle à toute la page.

Mais la question découvre un trou : une page qui module **réimprime un
second « 1=X »** au point de modulation, et `keyLabel` est *un seul*
cadre. Un détecteur de « 1= » hors en-tête a été écrit et **jeté** — il
note les vrais libellés d'en-tête à +0,28 alors qu'il filtrait à +0,55,
donc son « zéro trouvé » ne prouvait rien. Ce qui reste est solide sans
être automatique : **`audit-page` montre la page entière**, donc tout
second marqueur apparaîtra à la certification. Aucun sur les six pages
auditées jusqu'ici.

### Itération 19 — la fonte était une variable, et personne ne le savait

Les 75 chants sans calque échouaient **tous** pour le même motif, `trop peu
lu`, et certains lisaient 0/37, 2/52, 3/96. Un tel plancher ne ressemble pas
à un matcher qui peine : il ressemble à un vocabulaire qui ne correspond à
rien. La première hypothèse était donc la tonalité — `build-chords` répète
depuis le début que 32 des 124 partitions ne sont pas gravées dans celle de
leur `.cho`.

**Balayée, et réfutée.** Sur les pires cas, aucune des douze transpositions
ne lit mieux que zéro : 4/96, 4/65, 0/37. La tonalité n'était pas le sujet.

**Ce que la planche a montré à la place.** 永恒唯一的盼望 imprime
`E C#m F#m B G#m` — de l'E majeur parfaitement lisible — et le matcher y
lisait `F, Gm/F, Bb/D`. Les fautes n'étaient pas quelconques : `B` lu `E`,
`G#m` lu `C#m`, `C#m` lu `F#m`, **toutes des confusions de lettre
initiale**. La page est gravée dans une bold linéale large ; le gabarit,
lui, est en Helvetica Neue maigre, et à 32×32 les pleins gras ne se
séparent plus.

Mesuré contre une vérité terrain lue à l'œil (29 étiquettes) :

| gabarit | identifiées | retenues justes | retenues **fausses** |
|---|---|---|---|
| Helvetica Neue (la constante) | 20/29 | 15 | **7** |
| Helvetica Bold | 26/29 | 20 | 3 |
| Verdana Bold | **29/29** | **28** | **0** |

**Pourquoi les deux questions se tenaient.** Sous une fonte qui ne colle
pas, le balayage de tonalité ne décide rien : `+11` gagnait d'un point sur
`+9`, dans le bruit, et l'on concluait que la tonalité était bonne. Sous la
bonne fonte, `+11` gagne 28 contre 22. **Une mesure faite avec le mauvais
gabarit ne mesure rien** — c'est l'itération 1, sous un autre visage. C'est
aussi pourquoi le « ça ne marche pas » de l'itération 5 sur la déduction
automatique de tonalité était juste *et* trompeur : il était vrai à fonte
fixée.

`sweep-key.py` balaye donc les deux ensemble, 7 fontes × 12 demi-tons, et
ne propose un couple que s'il lit ≥ 55 % de la page **et** distance le
suivant de 12 points. Il ne publie rien : `apply-sweep.py` écrit `face` et
`printed_key` dans `gold/`, et la planche de lecture tranche.

**Trois choses réparées en chemin, toutes de la même nature — un paramètre
de page traité comme une constante de corpus :**

1. `read()` n'appliquait **jamais** l'écart de tonalité. `printed_key`
   existait, mais ne servait qu'au client : une page gravée ailleurs que
   son `.cho` ne pouvait pas être lue, quoi qu'on écrive dans la vérité
   terrain.
2. Le **jury** était toujours composé de trois maigres. Sur une page
   grasse, il se trompe de la même façon que la référence — l'unanimité
   dit alors « sûr » sur une faute partagée. Il suit maintenant la famille.
3. `evaluate.py`, `propose-extra.py` et `stray_chords` construisaient leurs
   gabarits avec la fonte par défaut. Le jeu de test des cas durs se
   mesurait donc lui-même au mauvais gabarit.

**Une troisième famille, trouvée en regardant.** 最美的礼物 est gravée en
**serif**, et ses lectures justes étaient rejetées faute d'unanimité — le
jury n'ayant que des linéales. Times avait pourtant été écartée à
l'itération 5 au seul motif qu'elle perdait sur 何等恩典 : une famille jugée
sur une page qui n'est pas la sienne, exactement l'erreur de la fonte de
référence. Les familles sont maintenant trois — linéale, grasse, serif —
chacune avec son jury.

**Ce que le jeu de test n'a pas pu dire, et pourquoi.** Sur les 244
étiquettes de cas durs, le changement ne bouge rien (218 identifiées avant
et après, 201 → 199 retenues). Ce n'est pas un démenti : **19 de ces 244
seulement (8 %) sont sur une page dont la fonte a changé.** Ces étiquettes
viennent des pages que le matcher lisait déjà à moitié — donc des pages
déjà dans la bonne fonte. C'est le biais de sélection de l'itération 16,
au même endroit : *un jeu de test constitué des ratés d'un système ne peut
pas mesurer ce que ce système ne voyait pas du tout.* D'où l'entrée de
永恒唯一的盼望 dans le jeu de contrôle, avec ses 29 étiquettes lues à l'œil :
116/179 sous la fonte de page, **107/179** sous l'ancienne constante.

**Résultat.** Les calques publiés passent de **50 à 67 sur 125**. Aucun
perdu, aucun des onze certifiés touché — le gel de l'itération 16 a fait
exactement son travail : la refonte du matcher n'a pas pu les atteindre.
Neuf calques existants gagnent des étiquettes (一颗谦卑的心 28 → 36,
如果你想知道 33 → 41, 信实的神 24 → 30).

**Ce qui reste, et qui ne se résoudra pas par la fonte.** Le balayage
laisse 58 chants sous ses seuils. Les planches en montrent au moins deux
familles pour lesquelles aucun gabarit rendu ne marchera :

- les accords **manuscrits** (从心合一, 无价至宝) — annotés à la main sur le
  scan ;
- les accords **collés aux chiffres**, en petit corps avec le bémol en
  exposant (伯利恒的喜讯 : `E♭ A♭ B♭` posés sur la rangée de mélodie), que le
  découpage en rangées ne sépare pas.

La première n'a pas de solution automatique et ces pages devront être lues
entièrement à la main. La seconde est un problème de **segmentation**, pas
de lecture — c'est le goulot que l'itération 16 avait déjà nommé, et il
reste le prochain.

### Itération 20 — le classement mentait, et la vérité terrain devient un veto

**Le cadre « 1=X » avalait la fraction.** L'échelle qui sépare la lettre du
chiffrage `4/4` était la médiane des hauteurs de *toute la bande* — donc de
tout ce qui traîne à droite sur la même ligne. Sur 尽情地微笑, l'annotation
« [共8张：原版/简版…] » monte cette médiane de 26 à 34 ; la fraction (51 px)
passe alors sous le seuil de 1,6× et **entre dans le cadre**. Masquer ce
cadre efface le chiffrage de la mesure. L'échelle est maintenant celle de
la lettre appariée, et le cadre proposé retombe exactement sur la mesure
faite à la main. Les onze cadres déjà certifiés ont été vérifiés : aucun
n'est touché.

**Le classement par couverture met en tête les pages dont on ignore le plus
de choses.** 尽情地微笑 affichait 49/52 — le meilleur du corpus, et *chaque
étiquette détectée y était lue juste*. L'audit de page y a trouvé **trois
rangées entières invisibles**, une typée `numbers`, deux typées `?` : une
rangée d'intro, et une rangée dans une **seconde tonalité** (`Bb F/A A Dm
Gm C`, le +3 de la rangée publiée — la page imprime deux jeux d'accords,
comme l'annonce son « [共8张… C/D调…] »). Une rangée jamais détectée n'entre
dans aucun dénominateur : la couverture ne pouvait pas la voir.

`worklist.py` cherche donc ce que la couverture ne peut pas voir — dans les
rangées typées autrement que `chords`, il apparie les amas au vocabulaire.
Une rangée de chiffres ou de hanzi n'apparie rien ; une rangée qui apparie
massivement est une rangée d'accords manquée. Verdict : **9 chants prêts,
17 avec au moins une rangée cachée**, sur 56 non certifiés.

**一颗谦卑的心 certifié (12ᵉ).** 42 accords, 8 tranches relues, aucun laissé
en D. Une étiquette sortait « Bm9 » à -0,01 là où la page imprime `D/F#` :
le score n'est toujours pas la vérité.

**Le défaut n'est pas un choix prudent.** 握手 se lit **26/26** sous
verdana-bold, et restait pourtant sur helvetica-neue parce qu'un rival la
lisait 24/26 — la marge exigée punissait les pages *faciles*. Sous ce
défaut, ses trois `Bm` sortaient `Em` à +0,69, unanimes. Ne rien écrire ne
veut pas dire s'abstenir : cela veut dire garder la gravure d'un seul chant
de 2026. La marge ne garde donc plus que la **tonalité**, où une erreur
transpose toute la page ; la fonte prend toujours la meilleure.

**Et c'est là que la mesure a mordu.** Le premier essai — prendre partout
la fonte qui couvre le plus — a fait apparaître **le premier accord faux
retenu depuis l'itération 6** : sur 我心坚定与你, un `D/A` lu `D/E` à +0,48,
unanime. La page est gravée en maigre ; la couverture y avait élu une
grasse, parce que cette page porte **deux tonalités** et que sa seconde
rangée n'est lisible sous aucun gabarit — la couverture y est du bruit.

Trois règles ont été essayées et mesurées :

| règle de choix de la fonte | contrôle | cas durs retenus | calques |
|---|---|---|---|
| couverture seule | 124 justes, **1 FAUX** | 191 | 73 |
| vérité terrain au classement | 113, 0 FAUX | 178 | 73 · **5 calques perdus** |
| **vérité en veto, couverture au classement** | 112, **0 FAUX** | 194 | **78 · aucun perdu** |

La deuxième échoue pour une raison qui vaut d'être écrite : beaucoup de
pages n'ont **qu'une à quatre** étiquettes lues à la main, et une fonte qui
lit juste cette seule étiquette sortait en tête en ratant tout le reste.
*Un jeu de vérité minuscule ne peut pas classer ; il peut interdire.* La
vérité terrain oppose donc son veto — une fonte qui retient un accord faux
là où l'œil a déjà lu est écartée quoi qu'elle fasse d'autre — et la
couverture départage les survivants.

**Résultat.** Calques **67 → 78 sur 125**, 2024 → **2349** étiquettes
publiées, **aucun calque perdu**, aucun des douze certifiés touché.
Le contrôle perd 4 justes (主的喜乐是我力量 7 → 4, 献上尊荣 5 → 4) : le veto
est conservateur sur les pages où il a beaucoup de vérité et peu de
couverture. C'est le prix assumé de FAUX = 0.

**Ce qui bloque maintenant, et qui n'est plus technique.** Deux familles ne
franchiront pas la certification sans décision :

- les pages à **deux tonalités** (我心坚定与你, 尽情地微笑, 求充满这地…) — la
  politique de l'itération 18 dit « ne pas publier la seconde rangée »,
  donc ces pages restent partielles **par construction**, quel que soit le
  progrès du matcher ;
- les accords **manuscrits** (从心合一, 无价至宝) — aucun gabarit rendu ne les
  lira jamais.

Le reste — les 17 chants à rangée cachée — est un problème de
**segmentation**, et c'est le prochain goulot, déjà nommé aux itérations
15 et 16.

### Itération 21 — les pages qui changent de tonalité publiaient des accords faux

Question posée par Timothée : les chants à deux tonalités doivent pouvoir
se transposer **section par section**, avec deux commandes indépendantes.
Avant de bâtir, il fallait savoir si ces chants existent.

**Le détecteur de marqueur, refait et calibré — puis mis en défaut.**
L'itération 18 avait écrit un détecteur de second « 1=X » et l'avait jeté,
faute de savoir ce qu'il valait. Calibré cette fois sur les 29 cadres déjà
mesurés à l'œil, le verdict est net : les vrais libellés d'en-tête notent
**+0,17 à +0,50, médiane +0,27**, quand l'ancien filtrait à **+0,55** —
au-dessus de *tous* ses positifs connus. Son « zéro trouvé » ne pouvait
rien dire. *Un détecteur qui ne retrouve pas ses propres positifs ne mesure
rien.*

Refait, il ratisse les 125 pages et sort 10 candidats — **tous faux**, tous
des chiffres de mélodie soulignés (`5 5 5 4`, `6 1 1 6 5`) dont le
soulignement imite le « = ». Conclusion tentante : le corpus ne module pas.

**Elle était fausse, et l'erreur valait la leçon.** 有你同行 commence en ré
(`1= D`, puis `D Bm G A`, `D A/C# Bm Em`) et **finit en mi** (`C#m A E B`,
`G#m C#m A B E`). Elle module — sans réimprimer le moindre « 1=X ». Le
marqueur n'est donc pas le bon signe : il faut chercher dans **le contenu
des accords**, pas dans la typographie.

`find-two-key.py` cherche, pour chaque rangée, l'intervalle qui la lit le
mieux. Le profil sépare les deux formats d'un coup d'œil :

- **queue contiguë** → modulation : 有你同行 lit `+0, +0, +2, +2` ;
- **alternance** → deux jeux d'accords empilés sur la même ligne de
  mélodie : 尽情地微笑 lit `+3, +0, +3, +0, +3, +0, +3, +0`.

Bilan sur les 78 pages publiées : **1 modulation** (有你同行, ré → mi) et
**5 pages à rangées empilées** (我相信, 我们的神, 我们高举耶稣的名, 尽情地微笑,
我心坚定与你).

**Et surtout : ces pages publiaient de faux accords.** 有你同行 sortait
`F#m A D` là où la page imprime `C#m A E` — au-dessus du seuil, **unanimes
au jury**. La cause est structurelle et retourne la force du système contre
lui : le vocabulaire est *fermé*, donc le matcher trouve toujours quelque
chose. Une rangée en mi lue avec un vocabulaire en ré ne produit pas un
échec visible, elle produit un **résultat confiant et faux** — le mode C,
que ni la couverture ni le jury n'attrapent puisqu'il compte comme une
réussite.

C'est aussi pourquoi le test naïf ne marche pas : la rangée en mi se lit
**75 %** avec le vocabulaire en ré. Ce n'est pas l'échec qui la trahit,
c'est l'**écart** — 100 % à +2 contre 75 % à 0. `foreign_rows` écarte donc
une rangée quand un autre intervalle la lit franchement mieux, et
`build-chords` ne publie plus rien de ces rangées-là.

有你同行 tombe alors sous `MIN_COVERAGE` et **cesse d'être publiée**. Les
calques passent de 78 à 77 : une page de moins, mais une page qui mentait.
Aucun des douze certifiés n'est touché — vérifié rangée par rangée, le
garde ne se déclenche sur aucun.

Un détail qui n'en est pas un : le seuil est à 0,20 et l'écart valait
`1,0 - 0,8`, soit **0,199…** en binaire. Sans epsilon, la seconde rangée de
有你同行 passait au travers. Le garde est calé à 0,20 parce que 0,15 fait
mordre 一颗谦卑的心, page auditée tranche par tranche et sûrement en ré.

**Ce qu'il reste à faire pour la fonctionnalité demandée.** Le calque ne
porte qu'une `printedKey` par chant. Rendre ces six pages justes suppose
une tonalité **par section**, un cadre « 1=X » par section, et deux
commandes côté client. Le garde de cette itération est la moitié
défensive du travail ; la moitié constructive reste à faire, et elle a
maintenant six cas réels pour la guider.

### Itération 22 — l'écharde qui volait la promotion

Le goulot nommé aux itérations 15, 16 et 20 était la **segmentation** : 23
chants portaient au moins une rangée d'accords qu'aucun contrôle ne voyait.
Cette itération va chercher la cause au lieu de compter les symptômes.

**Le motif, mesuré et non deviné.** Un diagnostic a rangé les 35 rangées
cachées par la raison exacte de leur non-promotion. Il ne restait presque
rien de la cause supposée (« silhouette clairsemée, glyphe étranger ») :

| motif | rangées |
|---|---|
| la rangée suivante est déjà `chords` | **19** |
| la rangée suivante est typée `?` | 10 |
| la rangée suivante est typée `lyrics` | 3 |
| typée chiffres, pas assez basse | 2 |
| typée paroles | 1 |

Les dix-neuf premières racontent toutes la même histoire. La promotion est
positionnelle — est `chords` la rangée utile qui précède une rangée de
chiffres — et entre les accords et les chiffres s'intercale souvent une
**écharde** : un arc de liaison, un crochet de reprise « 1. 2. », un trait
de renvoi. Le découpage en fait une bande à part entière ; comme c'est elle
qui touche les chiffres, c'est **elle** qui était promue. La vraie rangée
d'accords restait en `?` juste au-dessus, invisible au matcher, au calque et
à tous les contrôles. Sur 想起你, `Bm Esus4 E D E/D A/C# D Bm Esus4 E` était
perdue au profit d'une bande de 11 px ; sur 明亮晨星, au profit du crochet
`1. 2.` (h=13, ratio 75).

La mesure confirme la lecture : sur ces 19 bandes promues, **16 apparient 0
à 2 amas** quand la rangée qu'elles masquent en apparie 4/4 à 10/10.

**La hauteur ne peut pas trancher, et c'est un résultat.** L'écharde est
basse : le réflexe est de la reconnaître à sa hauteur, rapportée à la rangée
de chiffres qu'elle précède. Sur les 477 rangées promues du corpus, la
séparation semblait franche — sous 0,25, elles sont 33 et **une seule**
apparie quoi que ce soit. Le seuil a pourtant été rejeté au premier essai :
il efface la rangée `C F F ♭B C7` de 你们要赞美耶和华, gravure hymnaire dont
les étiquettes font 14 px, soit **0,17** de sa rangée de chiffres — plus bas
que presque toutes les échardes. Aucune des deux références essayées (la
rangée voisine, la médiane de la page) ne sépare :

| référence | échardes (max) | vraies rangées (min) |
|---|---|---|
| h / rangée de chiffres voisine | 0,433 | 0,230 |
| h / médiane des rangées de chiffres | 0,296 | 0,165 |

*Une liaison et les étiquettes minuscules d'un hymnaire ont la même taille.*
Et la métrique mentait dans le sens agréable : en effaçant cette rangée, le
`manqué` du jeu de contrôle tombait de 67 à 62 — la page n'avait pas
progressé, elle avait quitté le dénominateur.

**Promouvoir aussi, sans trancher : essayé, mesuré, insuffisant.** Puisque
la géométrie ne sépare pas, la doctrine de l'itération 7 s'impose — le
classifieur propose, le matcher dispose — et la bande du dessus est promue
*en plus* de l'écharde. Le contrôle a immédiatement chiffré le défaut :
**77 calques tombent à 45**, 2313 étiquettes à 1475. La couverture est un
*rapport* : ajouter des rangées que le matcher ne lit pas fait passer les
pages sous `MIN_COVERAGE`. Autrement dit, **le classifieur aveugle gonflait
la couverture**, et ces 32 pages ne publiaient que parce qu'on ignorait ce
qu'elles contenaient.

**Ce qui marche : proposer d'un côté, confirmer de l'autre.** Le classifieur
sort la bande du dessus en `chords?` — une proposition, pas une décision — et
`confirm_candidates` (match.py) la retient si **70 %** de ses amas
s'apparient au vocabulaire de la page. Le seuil n'est pas nouveau : c'est
celui avec lequel `worklist.py` débusque les rangées cachées depuis
l'itération 20. Sur le corpus, **327 rangées proposées, 38 confirmées** —
le matcher en écarte 289, dont toutes les rangées de paroles.

| | calques | étiquettes | contrôle | rangées cachées |
|---|---|---|---|---|
| avant | 77 | 2313 | 112/179, FAUX=0 | 23 |
| promotion sèche | **45** | 1475 | 107/179, FAUX=0 | — |
| **proposition + confirmation** | **78** | **2438** | 112/179, FAUX=0 | **11** |

Aucun calque perdu, 一粒麦子 gagné, **+125 étiquettes**, et les douze
certifiés sont **identiques au bit près** (vérifié, pas supposé). Quatorze
pages gagnent des étiquettes, et ce sont exactement les pages à rangée
cachée : 唯独依靠你 +13, 再次将我更新 +12, 一生跟随 +11, 想起你 +9,
这里有荣耀 +9.

**Le contrôle par transposition, sur cinq des quatorze.** 想起你 : la rangée
autrefois invisible sort `Cm Fsus4 F D# … A#/D D# Cm Fsus4 F` — 8 justes, 1
manquée, 0 fausse. 再次将我更新 : **13 sur 13** justes. 这里有荣耀 : 9 sur 9.
一生跟随 : 11 justes, 1 manquée. 唯独依靠你 : 12 justes et **un accord
faux** — la page imprime `C#m7`, le calque écrit `F#m7`, à +0,57, **jury
unanime**. C'est le mode C, et ni le score ni l'unanimité ne le signalent ;
seul l'œil l'a vu, sur la ligne du haut du compare.

**Un défaut plus ancien, découvert au passage.** L'écharde ne se contentait
pas de voler la promotion : elle **publie**. 再次将我更新 écrit un « F7 »
par-dessus les chiffres de la mélodie, 唯独依靠你 un « F# » à +0,45 jury
unanime. Ces faux accords sont là **depuis avant cette itération** et aucun
compteur ne les avait jamais montrés — ils comptent comme des réussites.

Les écarter par le même test de vocabulaire a été essayé et **rejeté par la
vérité terrain** : à 0,34 d'appariement minimum, le dénominateur du contrôle
tombe de 179 à 146 et 主的喜乐是我力量 perd une rangée de 12 étiquettes
attestées. *Le test qui confirme une rangée douteuse ne peut pas servir à en
rejeter une établie* : une vraie rangée mal lue est précisément le cas que
la boucle existe pour améliorer. La leçon de l'itération 20 se répète — la
vérité terrain oppose son veto.

**Ce qui reste ouvert.**

1. **Le `C#m7` de 唯独依靠你.** Le mécanisme `corrections` de
   `build-chords.py` refuse par construction de contredire une lecture
   retenue — sans quoi on ne saurait plus ce qui a été vérifié. Cette page
   ne peut donc pas être certifiée avant que sa rangée y=531 soit lue à
   l'œil et versée en vérité terrain.
2. **Les échardes qui publient.** Défaut réel, chiffré, sans correctif
   mesuré : ni la hauteur ni l'appariement ne les isolent sans emporter de
   vraies rangées.
3. **Les 11 rangées encore cachées**, dont les 10 du motif « la suivante est
   typée `?` » — la rangée de mélodie y passe pour autre chose parce que ses
   ligatures épaissies poussent son ratio au-dessus de `numbers_ratio_max`
   (脚步 : 0,81 contre 0,65). C'est le même goulot de segmentation, pris par
   l'autre bout, et c'est le prochain.

### Itération 23 — la mélodie que le classifieur ne reconnaissait plus

L'itération 22 laissait 16 rangées cachées, dont **8 sous le même motif** :
la rangée d'accords est bien là, mais la rangée de **mélodie** qui la suit
est typée `?` au lieu de `numbers`. Or la promotion exige une rangée de
chiffres en dessous — sans elle, rien n'est promu.

**Pourquoi une mélodie cesse d'être reconnue.** `numbers_ratio_max` vaut
0,65 : est « chiffres » une rangée dont la largeur médiane des amas ne
dépasse pas 65 % de sa hauteur. Mais les **ligatures soudent les chiffres**
entre eux, et un groupe de croches devient un seul amas large : sur 脚步 la
médiane monte à 0,81, sur 圣灵的江河 à 0,76. La rangée tombe en `?`, le
classifieur ne voit plus de système, et la rangée d'accords au-dessus reste
invisible.

**Ce qui la trahit n'est pas sa largeur mais son nombre d'amas.** Une
mélodie en porte une vingtaine, une rangée d'accords une poignée :

| nature | nombre d'amas médian |
|---|---|
| `numbers` | 25 |
| `?` | 6 |

D'où `melody_min_clusters` : sous `lyric_ratio_min` — pour ne pas happer
les paroles, qui sont des carrés pleins à ratio ~1 — une rangée d'au moins
**15 amas** est une mélodie. Le seuil a été balayé (15, 20, 25) : le jeu de
contrôle ne bouge à aucune valeur, **dénominateur compris**, et 15 publie
13 étiquettes de plus que 20.

**Résultat.** Calques 78 → **79**, étiquettes 2438 → **2525**, rangées
cachées **11 → 7**, aucun calque perdu, les douze certifiés identiques au
bit près. Sept pages gagnent : 脚步 +11, 住在你里面 +8, 哦十字架 +7,
圣灵的江河 +6, 赞美之泉 +4, 叫我抬起头的神 +2, 我们欢迎君王降临 +2.

**Et le contrôle visuel a mordu, encore.** Sur 脚步, les rangées retrouvées
sortaient justes — mais **cinq « C » de début de rangée sortaient « G »**,
à +0,56, jury unanime. Le zoom ne laisse aucun doute : ce sont cinq `C`
parfaitement nets, ni rognés ni collés au bord.

La cause n'est pas dans cette itération, elle y est seulement **révélée**.
La page était élue en `verdana-bold`, et c'est la seule fonte du banc qui
s'y trompe :

| fonte | ce qu'elle lit là où la page imprime `C` | couverture |
|---|---|---|
| helvetica-neue | **C** (+0,84) | 25/77 |
| din-bold | **C** (+0,76) | 25/77 |
| helvetica-bold | **C** (+0,73) | 25/77 |
| verdana-bold | **G** (+0,56) | 25/77 |

Quatre fontes à *couverture strictement égale*, et le classement en avait
retenu celle qui se trompe. Le veto de l'itération 20 n'a pas failli : il
n'avait simplement **rien à dire ici**, les six étiquettes lues à l'œil de
脚步 ne couvrant aucun début de rangée. *Un veto ne protège que là où
l'œil est déjà passé.*

Les cinq `C` ont donc été relus au zoom et versés en vérité terrain.
`sweep-key` réélit alors **helvetica-neue** (25/29, marge +66 %), et les
cinq faux accords deviennent justes. C'est le circuit de l'itération 10
dans les deux sens : l'œil comble un trou, et le trou comblé corrige une
décision automatique prise ailleurs.

**Contrôle par transposition, six pages relues** — 脚步, 住在你里面,
圣灵的江河, 赞美之泉, 哦十字架, et les gagnantes de l'itération 22 :
toutes les conversions justes, **aucun accord faux**. Ce qui reste non
converti est du manque, pas de l'erreur (les `B♭` restent le trou connu).

**Ce que la planche montre et qu'il faut noter.** A passe de 45 à 49 : la
mélodie mieux reconnue, la promotion s'applique aussi là où un système
**n'a pas** de rangée d'accords, et c'est alors la rangée de paroles du
système précédent qui est promue (`赐我 气息，毫无保留…`). Ces quatre
rangées **ne publient rien** — vérifié page par page — parce que le
matcher n'y apparie rien. Le classifieur reste permissif et le matcher
dispose (itération 7) ; il faut seulement savoir que le compteur A n'est
plus un compteur de faux positifs dangereux.

**Ce qui reste ouvert.** Les 7 dernières rangées cachées se répartissent
en trois familles, toutes déjà nommées : 3 sous une rangée typée `lyrics`
(la mélodie y passe pour des paroles — même cause, autre seuil), 2 sous une
rangée candidate écartée, 2 typées `numbers` sans être assez basses pour la
règle des accords courts. S'y ajoutent les deux défauts de l'itération 22,
inchangés : le `C#m7` lu `F#m7` de 唯独依靠你, et les échardes qui publient.

### Itération 24 — chercher le mode C au lieu de l'attendre

Deux itérations de suite, l'accord faux a été trouvé **par hasard** : en
regardant un compare rendu pour une autre raison. C'est le seul défaut qui
abîme la partition, et le seul qu'aucun compteur ne voit — il compte comme
une réussite. Cette itération arrête d'attendre qu'il se montre.

**Pourquoi le jury ne suffit pas.** Il ne convoque que la **famille** de la
fonte élue (itération 19, à bon droit : un jury linéal rejetait les lectures
justes d'une page serif). Mais l'inverse est vrai aussi : trois grasses
jugeant une page grasse se trompent **ensemble**, et l'unanimité certifie
alors la faute. C'est exactement ainsi que 唯独依靠你 publiait `F#m7` là où
la page imprime `C#m7`, à +0,57, jury unanime.

**Deux façons de deviner la fonte d'après l'image, mesurées et rejetées.**
Si l'on savait reconnaître la graisse d'une gravure, on cesserait de l'élire
à l'aveugle. Oracle : les 12 calques certifiés, dont la fonte est sûre.

| mesure | certifiés d'accord |
|---|---|
| part d'encre dans la boîte de l'étiquette | 6 / 12 |
| épaisseur médiane des fûts, en part de hauteur | **2 / 12** |

Et les familles se recouvrent : épaisseur médiane 0,148 pour les linéales,
**0,143** pour les grasses. À 20-30 px de hauteur d'étiquette, sur des scans
recompressés, *la graisse ne survit pas à la numérisation*. L'apparence ne
dira pas la fonte ; seule la lecture le peut.

**Ce qui marche : convoquer tout le banc et classer le désaccord.**
`dissent.py` fait lire chaque étiquette **publiée** par les sept fontes,
hors famille comprise, et ne décide rien — il classe par nombre de
dissidents et sort le zoom à côté. Sur le corpus : **29 étiquettes
contestées** par au moins 4 fontes sur 6. Toutes relues à l'œil :

| page | publié | imprimé | verdict |
|---|---|---|---|
| 最美的礼物 (×5) | `G` | `C` | **faux** |
| 我已得自由 (×2) | `F` | `E` | **faux** |
| 旷野中唯一的力量 | `F/C` | `C/D` | **faux** |
| 一生跟随 (×8) | `Dm` | `Dm` | juste |
| les 13 autres | — | — | juste |

**Huit faux accords**, dont aucun n'avait jamais été signalé par quoi que ce
soit. Le taux de fausse alerte est élevé (21 sur 29) et c'est très bien : le
détecteur propose, l'œil dispose, et 29 zooms se lisent en quelques minutes.

**Les trois causes sont trois maladies différentes**, et c'est le second
enseignement — « le calque publie faux » n'est pas un diagnostic :

1. **最美的礼物** — la fonte élue (helvetica-bold) confond `C` et `G`. Les
   cinq `C` relus, le veto écarte la grasse, helvetica-neue prend la page :
   43 → **46** étiquettes, 0 fausse.
2. **我已得自由** — même famille de faute (`E` lu `F`), même remède : la page
   n'avait aucune fonte notée, helvetica-bold l'emporte sous veto. 47 → **49**.
3. **旷野中唯一的力量** — `C/D` **n'est pas dans le vocabulaire** : le `.cho`
   simplifie l'accord de passage. Le vocabulaire étant fermé, *aucune fonte
   ne pouvait lire juste* — toutes tombaient sur `F/C`, le plus proche
   candidat. `extra_chords` règle ce cas-là, et lui seul : l'étiquette passe
   de `F/C` à `C/D` à +0,62.

**Le plancher de couverture a failli tout emporter.** Une fois les fontes
fautives écartées, les trois pages tombaient **juste sous** les 60 % — 59,7 %
pour 最美的礼物 — et perdaient leur calque. Mesuré face par face avec
`read()` lui-même, le choix était nu : *publier avec des accords faux, ou ne
pas publier*. Les étiquettes relues à l'œil ne sont pourtant pas des
contradictions mais des **trous** (lues juste, rejetées faute d'unanimité) :
c'est exactement ce que `corrections` couvre depuis l'itération 10. Versées
comme telles, les trois pages repassent le plancher.

**Résultat.** Calques 79 → **78**, étiquettes 2525 → **2500**, contrôle
112/179 **FAUX = 0**, douze certifiés identiques au bit près. Le contrôle par
transposition de 最美的礼物 ne laisse plus un seul accord faux.

**唯独依靠你 cesse d'être publiée**, et c'est la bonne issue. Mesure faite,
la seule fonte qui passe le plancher est celle qui retient le `C#m7` faux ;
la seule fonte propre (din-bold) lit 58,3 %, et ses deux meilleures rangées
tombent alors sous le seuil de confirmation de l'itération 22. Une page de
moins, mais une page qui mentait — comme 有你同行 à l'itération 21.

**Un correctif essayé et rejeté au passage.** `sweep-key` classe les
survivants du veto par ce qu'ils *identifient*, alors que la publication
exige en plus l'unanimité. Les faire classer par ce qui se publie
vraiment semblait s'imposer — et sur 最美的礼物, din-bold paraissait alors
publier 43 contre 39. C'était **une erreur de ma mesure** : j'avais partagé
la chasse de la fonte élue avec les jurés, quand `read()` en calcule une par
juré. Corrigée, la différence s'évanouit et le classement ne change plus
rien nulle part. Le correctif est retiré — *un changement sans gain mesuré
n'entre pas.*

**Ce qui reste ouvert.** Les échardes qui publient (itération 22) ; les
7 rangées cachées (itération 23) ; et désormais **唯独依靠你**, qui ne
reviendra que par la transcription complète de ses rangées en vérité
terrain — la voie de certification, pas celle du matcher.

### Itération 25 — le défaut que le désaccord ne peut pas voir

`dissent.py` (itération 24) classe les étiquettes publiées par le désaccord
entre fontes. Il a trouvé huit accords faux, mais il est **aveugle à toute
une famille** : devant un arc de liaison, les sept fontes tombent d'accord
sur la même absurdité. Le désaccord est nul, donc le détecteur se tait. Or
c'est exactement le défaut nommé à l'itération 22 et resté ouvert depuis :
les **échardes qui publient**.

**Le signe est ailleurs : le parasite est seul.** Une vraie rangée d'accords
en publie plusieurs ; une écharde en publie **un**, tiré d'une liaison ou
d'un crochet de reprise. `--isolated` classe donc les étiquettes publiées
seules — ou par deux — dans une rangée qui compte au moins trois amas.
72 sur le corpus, 36 relues au zoom, **3 parasites** :

| page | publié | ce que c'est vraiment |
|---|---|---|
| 再次将我更新 y=1571 | `F#m/E` (+0,30) | un **arc de liaison**, bande de 11 px |
| 再次将我更新 y=871 | `E7` (+0,41) | un **arc de liaison**, bande de 10 px |
| 求主充满我 y=236 | `Em` (+0,54) | le mot « **Fill** » du titre anglais |

Les trois étaient au sommet du classement ; les rangs 14 à 36 sont tous
justes. Le tri fonctionne, et c'est ce qui rend l'inspection tenable.

**Ce qui manquait n'était pas un seuil mais un geste.** Aucune barre ne
sépare ces trois-là : un arc sort `E7` à +0,41, « Fill » sort `Em` à +0,54,
au-dessus du seuil, et l'itération 22 avait déjà mesuré qu'on ne peut pas
les reconnaître à leur hauteur sans emporter les étiquettes minuscules d'un
hymnaire. La voie de transcription complète savait pourtant les nommer
depuis longtemps — un `null` dans `chord_rows`. La voie de **lecture**, elle,
n'avait pas son équivalent : on pouvait combler un trou (`corrections`) mais
pas retirer un intrus, si bien que la seule façon d'ôter un parasite vu à
l'œil était de **dépublier la page entière**.

`not_labels` comble ce manque : une liste de positions `"y,x"` que l'œil a
vues et déclarées non-étiquettes. Elles ne comptent pas non plus comme
manquantes — elles ne sont pas des accords, donc elles n'ont pas à peser sur
la couverture. Les trois parasites disparaissent, **aucun calque n'est
perdu**, 2500 → 2497 étiquettes.

**Une fausse alerte qui valait un correctif d'outil.** 永恒唯一的盼望 publie
`C` là où le zoom montre clairement un `B` — j'ai cru tenir un neuvième
accord faux. C'est **juste** : le `.cho` est en fa, la page est gravée en mi,
et le calque publie les noms du `.cho` que le client transpose. *Le zoom
montre le glyphe imprimé, pas le nom publié*, et les deux diffèrent sur les
32 pages qui ne sont pas dans la tonalité de leur `.cho`. La légende porte
maintenant les deux (`publie C = « B » imprimé`) — sans quoi l'inspection à
l'œil condamne des étiquettes correctes, ce qui est le pire service qu'un
détecteur puisse rendre.

Le détecteur saute par ailleurs ce que `not_labels` a déjà écarté : un amas
jugé une fois ne se re-signale plus.

**Où en sont les trois défauts ouverts.** Les échardes qui publient sont
**réglées** pour les cas vus ; le mécanisme existe désormais pour les
suivants. Restent les 7 rangées cachées (itération 23) et 唯独依靠你, qui ne
reviendra que par transcription complète.

### Itération 26 — les pages qui manquent le plancher d'un cheveu

Les itérations 24 et 25 chassaient les défauts de ce qui est **publié**.
Celle-ci regarde ailleurs : les **47 pages sans aucun calque**. Rangées par
ce qui leur manque pour franchir les 60 %, la moitié en est à portée de
main — cinq pages à **une seule étiquette** près, sept autres à deux ou
trois. Une page publiée à 58 % ne publie *rien* ; trois étiquettes relues la
font basculer. C'est le meilleur rendement disponible.

Trois pages traitées, trois calques : **78 → 81**, 2497 → **2559**
étiquettes, aucun perdu, les douze certifiés identiques au bit près.

| page | avant | après |
|---|---|---|
| 云上太阳 | 17/30 (57 %) | **28/29** |
| 给梦想一双翅膀 | 13/22 (59 %) | **21/22** |
| 这条路上我们一起走 | 11/19 (58 %) | **13/15** |

Ce que les zooms ont montré, et qu'aucun seuil n'aurait donné : la plupart
des amas rejetés sont des étiquettes **entre parenthèses** — `(A/C#)`,
`(D/A)` — que le matcher note +0,19 ou moins parce que les parenthèses
gonflent la boîte. Le vocabulaire les contient pourtant, et gold sait déjà
les écrire depuis l'itération 10 (`(C/G)`).

**Le veto de fonte ignorait la vérité terrain la plus récente.** `sweep-key`
ne lisait que `extra_labels` et `chord_rows` — pas `corrections`. Or depuis
l'itération 24 c'est là que va l'essentiel de ce qui est relu à l'œil : neuf
corrections venaient d'être versées sur 给梦想一双翅膀, et la page publiait
quand même un `C` là où elle imprime `G`, à +0,48, jury unanime. Le veto
branché sur les corrections, la page élit helvetica-bold et le faux accord
devient juste. *Une vérité terrain que le veto ne lit pas ne protège
personne.*

**Et une faute que j'ai commise, corrigée dans la même itération.** J'avais
marqué `not_labels` deux crochets de reprise de 这条路上我们一起走. Le
contrôle par transposition a montré qu'ils sont **soudés à de vrais
accords** — `Em E7 A7` sur la même barre horizontale, un seul amas. La page
affichait alors 13/13, soit 100 %, tout en laissant trois accords dans
l'ancienne tonalité à côté d'accords transposés : le mode D, recréé à la
main, et **maquillé en couverture parfaite**.

D'où la règle, désormais écrite dans le fichier : *`not_labels` veut dire
« il n'y a pas d'accord ici », jamais « je ne sais pas le lire »*. Un amas
illisible **manque** ; il n'est pas absent. Les deux crochets retirés, la
page retombe à 13/15 — 87 %, honnête, et toujours publiée.

**Ce qui reste.** 44 pages sans calque, dont une douzaine à moins de cinq
étiquettes du plancher : le même geste les convertira. Puis les 7 rangées
cachées (itération 23) et 唯独依靠你.

### Itération 27 — une rangée de paroles gonflait le dénominateur

Suite directe de l'itération 26 : trois pages de plus, prises dans la même
file de celles qui manquent le plancher d'un cheveu.

| page | avant | après |
|---|---|---|
| 大声敬拜 | 25/44 (57 %) | **26/34** |
| 握住幸福 | 37/64 (58 %) | **49/64** |
| 我的家要荣耀主 | 35/68 (51 %) | **49/68** |

Sur 握住幸福 et 我的家要荣耀主 il n'a rien fallu d'autre que des yeux :
douze amas relus au zoom chacun, tous des accords à barre oblique
(`G/D`, `C/D`, `Cm6/D`, `Em/B`, `Bm/A`, `B/D#`) que le matcher note bas.

**大声敬拜 était un cas différent, et il a demandé un geste nouveau.** La
page restait à 57 % alors que ses accords étaient presque tous lus. Le
dénominateur portait dix amas de trop : le classifieur avait promu une
**rangée de paroles entière** en rangée d'accords — celle du système
précédent, comme il arrive quand un système n'a pas d'accords imprimés
(défaut connu depuis l'itération 23). Elle ne publiait rien, mais elle
pesait, et elle seule maintenait la page sous la barre.

Séparer ces rangées par la géométrie a été **mesuré et rejeté** : abaisser
`lyric_min_clusters` à 10 coûte 43 étiquettes publiées ailleurs, dont huit
sur un chant certifié. Le réglage global paie donc le cas particulier au
prix fort. `not_rows` fait le contraire : c'est l'œil qui désigne la
rangée, une à la fois, et l'on note ce qu'il a vu. La page passe à 76 %.

*Une couverture n'est pas seulement ce que l'on publie ; c'est un rapport,
et son dénominateur est aussi une hypothèse.*

### Itération 28 — masquer, quand on ne peut pas transposer

Deux partitions fournies pour être mises en ligne :
**赞美中信心不断升起** (赞美之泉, 1=C) et **主我献上生命给你**
(约书亚乐团 / Don Moen, 1=F). Corpus 125 → **127**.

Le second n'existait pas du tout sur le site : son `.cho` a été écrit
depuis le scan par la méthode pixel du skill `chord-placement` (bandes,
amas, appariement accord → syllabe par distance), avec les mélismes notés
`[X][ ]` comme le fait déjà 我安然居住.

**赞美中信心不断升起 : deux familles d'échec, opposées.** Les huit `C`
seuls sont les étiquettes les **moins** bien notées de la page (+0,32 à
+0,41) — une lettre unique a une boîte étroite, et le score s'en ressent.
Les neuf `G` sont les **mieux** notées (+0,70 à +0,80) et pourtant les
seules refusées : `keep` exige `score ≥ MIN_SCORE` **et** l'unanimité du
jury, et sur cette gravure les sept fontes lisent ce glyphe autrement.
*Aucun score ne rachète un jury divisé* — c'est voulu (l'unanimité est ce
qui tient FAUX = 0 depuis l'itération 20), mais il faut savoir que cela
coûte une page entière : 74 % au lieu de 100 %. Les dix-sept relus, la
page est à **38/38**.

**主我献上生命给你 imprime deux rangées d'accords par système** — les
positions de capo (`E A/E B/E F#m/E…`) au-dessus des accords réels
(`F Bb/F C/F Gm/F…`), sous un « 1=F ». C'est le cas laissé de côté le
09/08 ; Timothée a tranché le 20/08 : **masquer la rangée de capo, publier
la rangée réelle.**

Et `foreign_rows` ne pouvait pas s'en charger, pour une raison de
structure et non de réglage : le classifieur laisse ces rangées en
`chords?` **parce qu'elles sont suivies d'une rangée d'accords, pas de
chiffres**. Elles n'entrent donc jamais dans `read()` — et ce que `read()`
ignore, `foreign_rows` ignore aussi, puisqu'il travaille sur les mêmes
rangées. Le détecteur de tonalité étrangère est aveugle exactement là où
la tonalité étrangère est la plus régulière.

`mask_rows` comble ce trou : une liste de `top` de rangées que l'œil a
désignées, publiées comme des étiquettes **sans texte** — le cadre masque,
rien ne s'écrit. Elles ne pèsent pas sur la couverture : on n'a pas
prétendu les lire. Cinq rangées, 40 amas masqués.

**Ce que l'audit a montré et qu'aucun compteur n'aurait donné.** À 38/39 la
page semblait finie. Le seul amas manquant, `1945,1018`, **soudait
`Bb/F` et `F`** — 12 px les séparent. Une `correction` n'y aurait écrit
qu'un accord des deux, et l'autre serait resté en fa au milieu d'accords
en fa# : le mode D, fabriqué à la main, sur une page par ailleurs
impeccable. Deux `extra_labels` mesurées au zoom (x=1019-1083 et
x=1096-1107) séparent les deux. *Un amas n'est pas une étiquette — c'est
une hypothèse sur le nombre d'étiquettes.*

Les deux `1=X` ont été mesurés à la main : `measure-keylabel` ne propose
rien sur ces pages, le libellé étant collé au chiffrage de mesure et, pour
l'une, à « （注意XM7=Xmaj7） », pour l'autre à « [共2页] ».

**Les deux pages sont certifiées** (12 → **14 /127**). Contrôle navigateur
fait sur les deux, en thèmes clair et sombre : Chrome headless piloté en
CDP par le `WebSocket` natif de Node 24, avec le `Page.reload{ignoreCache}`
sans lequel la seconde capture est servie du cache et sort identique au bit
près. Les rangées de capo disparaissent proprement — fond **noir pur** en
thème sombre, aucun pavé gris, le défaut de l'itération du 01/08 ne
revient pas par les masques. Puis gelées : 80 et 38 étiquettes.

**Le gel et le masque devaient être accordés.** `freeze.py` recopie tout
`labels`, masques compris ; les reposer au build suivant les aurait
dupliqués — deux cadres identiques l'un sur l'autre, invisibles à l'œil et
faux dans les données. `mask_rows` ne s'applique donc pas quand la page est
gelée : le calque gelé *est* le calque publié.

**Ce qui reste.** Une réserve cosmétique sur 主我献上生命给你 : au système
5, « C#/F# » et « B/F# » se touchent, les noms transposés étant plus larges
que ceux gravés — lisible, mais serré, et c'est une propriété générale du
calque, pas de cette page. Et 赞美中信心不断升起 annonce « [共2页] » :
seule la page 1 a été fournie.

### Itération 29 — certifier en lot, et ce que la file « PRÊT » cachait

Itération d'**accélération** : les précédentes traitaient trois pages en
lisant des amas un par un. Le calcul, lui, ne coûte rien —
`worklist.py` classe les 127 chants en **9 secondes**, un audit de page
complet sort en **0,2 s**. Tout le temps passe dans *mes* lectures d'image.
La seule accélération réelle est donc de **grouper** : un lot de pages par
itération, et les planches lues **en parallèle** au lieu d'une par tour.

**Les cadres « 1=X » d'abord, tous ensemble.** `measure-keylabel.py` sans
argument propose les 55 cadres manquants du corpus sur 6 planches ; les six
planches lues d'un coup, **24 cadres** sont retenus et 31 rejetés — des
« ♩=NN » (même silhouette), des rangées de paroles et des rangées d'accords
que la boîte avait happées. Chaque lettre lue a ensuite été confrontée à
`printedKey` : **24 accords sur 24**. Cadres publiés : 31 → **55**.

**Puis l'audit des pages que `worklist` dit « PRÊT ».** Douze l'étaient ;
使命 et 你坐着为王 restent écartées (accords à alternative `F#m或A`,
décision du 09/08) et 丰盛的应许 est reportée — sa page imprime `C/F`,
`Bb/F`, `Em7b5`, `A7`, `Cm`, **absents du vocabulaire de son `.cho`** : c'est
un cas `extra_chords`, pas une lecture. Restaient six pages.

**Cinq sur six cachaient un défaut, et aucun compteur ne le voyait.**

| page | ce que l'audit a montré |
|---|---|
| 一生爱你 | rien — propre du premier coup, 30 accords |
| 你恩典不离开 | rien — mais 2 des 7 amas relus étaient lus `E/G#` par le matcher là où la page imprime `B/D#` |
| 奇异恩典 | une **rangée d'harmonisation alternative** entre parenthèses, `(E/G#  F#m  B7)`, restée en mi |
| 这条路上我们一起走 | une **rangée entière jamais détectée** (`F#m G Em E7` + un `A7` décalé d'une ligne) |
| 尽情的敬拜 | **5 rangées de capo** en sol *et* un système dont la rangée réelle n'était pas publiée alors que sa jumelle capo l'était |
| 耶和华是应当称颂的 | une paire parenthésée `( Cm7  F )` restée en fa, et le « （F调） » du titre qui ne suivait pas la transposition |

**Le motif commun est la rangée « en plus ».** Une gravure qui imprime deux
informations harmoniques par système — l'alternative entre parenthèses, la
position de capo, la reprise `1./2.` — produit une rangée que le classifieur
range ailleurs. Elle n'entre alors dans **aucun dénominateur** : la page
affiche une couverture flatteuse (13/15 sur 这条路上我们一起走) tout en
laissant une rangée entière dans l'ancienne tonalité. `worklist` la déclare
« PRÊT » précisément parce qu'il ne la voit pas. *Une page « prête » n'est
qu'une page dont on ignore encore ce qu'on ignore.*

**Sur 尽情的敬拜, les deux moitiés du problème étaient dans la même page.**
Cinq systèmes impriment une rangée capo en sol au-dessus de la rangée réelle
en la, sous un « 1=A ». Quatre ont vu leur rangée réelle publiée et leur
rangée capo laissée telle quelle ; le cinquième (y=1207) a eu l'inverse — sa
rangée capo publiée et sa rangée réelle ignorée. Rangées appariées deux à
deux sur une planche, `mask_rows` sur les cinq rangées en sol, six
`extra_labels` sur la rangée réelle manquante.

**Un amas soudé n'est pas une boîte.** Sur 这条路上我们一起走, `Em`, `E7`,
`A7` et `D` sont soudés au **trait horizontal des crochets de reprise** :
l'amas mesure 787 px de large. Le publier tel quel effacerait la moitié du
crochet. Les boîtes ont été coupées au **profil de colonnes** — ne garder que
les colonnes plus hautes qu'un simple trait sépare le glyphe de la ligne qui
le traverse. Même geste vertical sur 尽情的敬拜 (profil de lignes) pour ne
pas manger le crochet sous `Esus4`.

**Et une leçon de méthode sur les parenthèses.** `overlay.transpose_chord`
gère déjà les parenthèses **dépareillées** — `(E/G#` seul, `B7)` seul — parce
qu'une rangée entièrement parenthésée se découpe en amas. Là où l'amas
sépare proprement la parenthèse du nom (`( Cm7  F )` sur 耶和华), mieux vaut
poser la boîte sur le **seul nom** et laisser la parenthèse gravée : moins de
pixels masqués, rien à reconstruire. Réserve : `F` transposé en `F#` est plus
large que le `F` gravé et passe par-dessus la parenthèse fermante. C'est la
propriété générale du calque déjà notée à l'itération 28, pas un défaut de
cette page.

**Bilan.** **14 → 20 certifiés** sur 127, 2801 → **2865** étiquettes,
86 calques (inchangé — cette itération corrige et certifie, elle n'ouvre pas
de page neuve). Les six sont gelées. `npx tsc --noEmit` et `npm run validate`
passent.

**Ce qui reste.** 丰盛的应许 en attente d'`extra_chords`. Les 6 pages
« 1 rangée cachée » de `worklist` (信实的神, 如鹰展翅上腾, 尽情地微笑,
住在你里面, 我们的神, 我的救赎者活着, 给梦想一双翅膀, 献上尊荣) sont
maintenant la file la plus rentable : elles portent le même défaut, et
l'itération vient de montrer comment le lire. Puis les ~40 pages sans calque.

### Itération 30 — la rangée que le classifieur range ailleurs

L'itération 29 avait laissé une file nommée : les 8 pages que `worklist.py`
marque « 1 rangée cachée ». Elles portent toutes le même défaut, et
`hidden_rows()` sait déjà le nommer — il cherche, dans les rangées typées
**autrement que `chords`**, celles dont les amas s'apparient massivement au
vocabulaire. Neuf rangées sont sorties. **Les neuf étaient de vraies rangées
d'accords.**

**Rendre d'abord, décider ensuite.** Plutôt que de traiter page par page,
les 31 rangées non publiées des 8 pages ont été rendues sur **deux planches**,
cadres d'amas activés. Une lecture, et le tri se fait tout seul : rangées
d'accords à publier, textes de tempo (« ♩=88 渴慕、呼求地 »), en-têtes,
chiffres de mélodie, et — la surprise — **rangées gravées dans une autre
tonalité**.

**Deux pages impriment deux tonalités par système.** 尽情地微笑 (1=D) porte
quatre rangées en **fa** au-dessus de ses rangées en ré ; 我们的神 (1=G) trois
rangées en **la** au-dessus de ses rangées en sol, annoncées 【最后一遍副歌】.
Le contrôle décisif a été de rendre les **paires** côte à côte : la rangée
publiée et sa jumelle, l'une sous l'autre. Sans ça on masque la mauvaise.
`mask_rows` — écrit à l'itération 28 pour les positions de capo — s'applique
tel quel : son commentaire dit « une rangée d'accords gravée dans une **autre
tonalité** que la page », ce qui est exactement le cas.

**Le pire endroit pour une rangée manquée, c'est le bord de la page.** Sur
尽情地微笑 la rangée manquante était la **toute première** ; sur 献上尊荣 la
**dernière**. Ni l'une ni l'autre n'a de voisine au-dessus pour donner le
contexte au classifieur, et ce sont les tranches d'audit qu'on regarde le
moins — la 1 parce qu'elle est pleine de titre, la dernière parce qu'elle est
à moitié vide. Les regarder quand même est tout l'intérêt d'`audit-page`.

**Deux passes valent mieux qu'une.** Publier la rangée cachée ne suffit pas :
sur 住在你里面 l'audit a montré, *après* le correctif, une dizaine d'accords
sans cadre dans des rangées pourtant détectées. Un second `propose-extra
--all` les a tous sortis. Ordre qui marche : rangées cachées → rebuild →
`propose-extra --all` → rebuild → audit. Sur les 40 amas relus, **8 étaient
lus faux** par le matcher (`A/D` pris pour `A/C#`, `G/D` pour `G/B`, `C#`
pour `D`, `F#m` pour `C#`).

**Mesurer une boîte : la bande de mesure doit avoir du blanc des deux côtés.**
Trois fois de suite les boîtes ont coupé la hampe d'un `♭` ou d'un `♯`, parce
que le bloc d'encre touchait le bord de la bande. Une assertion (`le bloc ne
doit toucher aucun bord`) l'attrape immédiatement. Le découpage par **blocs
séparés de lignes blanches** garde la hampe fine, là où le seuil d'épaisseur
la jette ; le découpage par **colonnes plus hautes qu'un trait** sépare un
`Em` du crochet de reprise qui le traverse. Les deux servent, sur des axes
différents.

**Cinq cadres « 1=X » de plus, mesurés à la main.** `measure-keylabel`
proposait pour ces pages la ligne « ♩=NN » ou une rangée d'accords — même
silhouette. Une bande bornée à droite pour exclure la fraction 4/4, un zoom
×4, et c'est réglé.

**Bilan.** **20 → 27 certifiés** sur 127, 2865 → **3034** étiquettes,
cadres 1=X 55 → **59**. Les sept sont gelées. `npx tsc --noEmit` et
`npm run validate` passent.

**我们的神 reste PARTIEL, et c'est la bonne réponse.** Trois raisons, toutes
connues : un `G或G/B` (accord à alternative, décision du 09/08 : laisser) ; un
**second « 1= A » imprimé dans la portée** pour le dernier refrain, que
`keyLabel` — un seul cadre — ne sait pas suivre (trou identifié à
l'itération 18, ici rencontré pour de bon) ; et la question ouverte ci-dessous.
Sa rangée finale manquée a quand même été publiée : une page partielle n'a pas
le droit de mélanger deux tonalités.

**Question pour Timothée.** Le 09/08 la consigne sur les pages à deux
tonalités était « laisser » ; le 20/08, sur les rangées de capo, « masquer ».
尽情地微笑 et 我们的神 tombent entre les deux : ce sont des versions dans une
autre tonalité, pas des positions de capo. J'ai **masqué**, parce que laisser
une rangée en fa à côté d'accords en ré est le mode D, que la boucle nomme
« pire que de n'avoir aucun calque ». Si tu préfères qu'on les laisse visibles,
il suffit de retirer `mask_rows` de ces deux `gold/` — mais alors les deux
pages ne peuvent plus être certifiées.

**Ce qui reste.** `worklist` ne signale plus qu'**une** rangée cachée sur tout
le corpus. Six pages « PRÊT » attendent (dont 丰盛的应许, en attente
d'`extra_chords`, et 十字架是我的荣耀 / 我们成为一家人 / 握手 dont le cadre
1=X est à mesurer à la main). Puis les ~40 pages sans calque.

### Itération 31 — la seconde tonalité, cherchée mécaniquement

L'itération 30 avait trouvé sept rangées gravées dans une autre tonalité en
rendant les rangées jumelles côte à côte et en les lisant. Le test, lui,
existait déjà : `foreign_rows` (itération 21) balaie les douze transpositions
du vocabulaire et retient la rangée qui s'apparie nettement mieux ailleurs
que dans la tonalité de la page. Mais il ne voyait que les rangées que
`read()` produit — `chords`, plus les `chords?` confirmées. **Or une rangée
en tonalité étrangère est précisément celle que le classifieur n'ose pas
promouvoir** : elle reste en `chords?`, en `?`, en `lyrics` ou en `numbers`,
et elle échappe au détecteur exactement là où elle est la plus régulière.

`foreign-scan.py` applique le même test à **toutes** les rangées du
classifieur. Il ne modifie rien : il propose, l'œil dispose. **15 rangées
sorties sur 6 pages, toutes vraies**, avec l'intervalle en prime.

**Les seuils de publication ne sont pas les seuils de revue.** `FOREIGN_HIT`
et `FOREIGN_MIN_ROW` sont réglés pour la publication, où une rangée écartée à
tort coûte de la couverture. Pour une revue à l'œil c'est l'inverse : on veut
tout voir, quitte à rejeter. 我们高举耶稣的名 cachait trois rangées en mi et
le seuil de publication n'en voyait qu'une — l'une a 3 amas pour un minimum
de 4, l'autre s'apparie à 0,67 pour une barre à 0,70. Deux ratés de justesse,
sur une page qui écrit pourtant en toutes lettres « 升调用上层和弦 »
(« pour monter la tonalité, prenez les accords de la rangée du haut »). D'où
`--large`, qui relâche les deux seuils pour la seule revue.

**Ces pages le disent en toutes lettres, et c'est une convention de maison.**
« 升调用上层和弦 » (我们高举耶稣的名), « [回来后G调] » et « (若升调) »
(我相信), « 原曲G调升A调，建议会众D调升E调 » (我们高举耶稣的名 encore) : la
gravure 赞美之泉 empile régulièrement une seconde piste harmonique un ton
au-dessus, pour l'assemblée qui monte la tonalité. Ce n'est pas un accident
de mise en page, c'est un genre — ce qui explique qu'on le rencontre sept
fois en deux itérations.

**Le défaut que le masque a révélé.** `mask_rows` posait ses cadres de masque
**par-dessus** les étiquettes qu'une itération précédente avait placées à la
main dans la même rangée, au lieu de les annuler. Le masque et l'étiquette
s'empilaient : la rangée se retrouvait transposée à moitié — le mode D, mais
*à l'intérieur d'une seule rangée*, ce qu'aucun compteur ne regarde. Quatre
`extra_labels` étaient dans ce cas (明亮晨星 publiait « G » et deux « Am »
dans une rangée en sol). Une rangée masquée ne publie plus rien, ce qu'on y
avait posé à la main compris.

**La seconde tonalité n'arrive pas toujours en rangée.** Sur 我相信, deux
amas isolés en portaient : le « G » de y=616, **premier** de sa rangée mais
seul sur sa ligne — donc jamais promu en rangée, donc invisible à tout ce qui
raisonne par rangée — et le « (C/D) » de y=1731, surmonté de « (若升调) » et
mêlé à une vraie rangée en fa. Tous deux masqués à la main, même forme qu'un
`mask_rows` : une étiquette au texte vide, qui efface sans réécrire.

**Un faux positif, et il est instructif.** Sur 握住幸福, `foreign-scan`
donnait y=722 à +1 demi-ton. La rangée est « (D  D/F#) … (G/D  C#m7b5) » :
une harmonisation alternative entre parenthèses, **dans la tonalité de la
page**. Elle s'apparie mieux à +1 par accident de vocabulaire, pas par
tonalité. Publiée telle quelle, parenthèses comprises — `transpose_chord` les
gère dépareillées depuis l'itération 29. Le matcher, lui, lisait
« C#m7b5) » → « Cm6/D » : `evaluate.py` le range parmi ses 17 cas durs lus
faux. C'est bien l'œil qui devait trancher. Et pour qu'une proposition
tranchée ne revienne pas à chaque tour, `foreign-scan` écarte désormais les
rangées **où le calque publie déjà** : la publication est une décision, au
même titre que `mask_rows`.

**Ce que l'audit trouve encore et qu'aucun scan ne voit.** Sur
旷野中唯一的力量, deux choses :

- un « Bb/C » d'introduction posé au-dessus du chiffrage arpégé « 1 5 4 1 »,
  rangé en `numbers` par le classifieur : ni publié, ni masqué, donc resté en
  fa sur la page transposée ;
- une **troisième** rangée en sol (y=1007) que `foreign-scan` ne sort pas,
  parce que ses deux amas « 先A/C#后D/C再Cm/Eb » et « 先G/D后Bm » ne
  s'apparient à rien et font tomber le taux sous `FOREIGN_HIT`.

*Le scan trouve les rangées régulières ; l'œil trouve celles que l'annotation
rend irrégulières.* La leçon est la même qu'à l'itération 29 sur `worklist` :
un outil ne signale que ce qu'il a été écrit pour voir.

**旷野中唯一的力量 reste PARTIEL, et c'est la bonne réponse.** Deux raisons,
toutes deux déjà tranchées : « 先C/E后Am » (« d'abord C/E puis Am ») est le
cas « 或 » du 09/08 — le modèle « une étiquette = un accord » ne sait pas le
rendre, on laisse, le bandeau dit vrai ; et un second « 1= G » imprimé dans
la portée pour la reprise, que `keyLabel` — un seul cadre — ne sait pas
suivre (trou nommé à l'itération 18, rencontré sur 我们的神 à l'itération 30,
rencontré ici pour la troisième fois). Ses rangées en sol sont quand même
masquées et son « Bb/C » publié : **une page partielle n'a pas le droit de
mélanger deux tonalités**.

**Bilan.** **27 → 31 certifiés** sur 127 (我们高举耶稣的名, 我心坚定与你,
明亮晨星, 我相信), 3034 → **3158** étiquettes, cadres 1=X 59 → **60**. Les
quatre sont gelées. Contrôle 112/179, FAUX = 0 tenu. `npx tsc --noEmit` et
`npm run validate` passent.

**Ce qui reste.** `foreign-scan` ne signale plus rien sur le corpus ; en
`--large` il ne reste qu'un candidat, 这一生最美的祝福 y=387, et c'est un
faux positif — « Gmaj7 … D/A … Gmaj7 » est en ré comme la page. Mais cette
rangée-là n'est **pas publiée** : c'est une rangée d'accords cachée de plus,
que ni `worklist` ni les compteurs ne signalent, et une piste pour la
prochaine itération. 在这里
(2 rangées masquées, 24 amas à relire), 我们的神 et 旷野中唯一的力量 restent
partielles pour des raisons nommées. Six pages « PRÊT » attendent (dont
丰盛的应许, en attente d'`extra_chords`, et 十字架是我的荣耀 /
我们成为一家人 / 握手 dont le cadre 1=X est à mesurer à la main). Puis les
~40 pages sans calque.

### Itération 32 — le vocabulaire fermé, et le cadre qu'aucun outil ne mesure

Trois pages attendaient depuis l'itération 29 avec la même mention :
« PRÊT (cadre 1=X à mesurer à la main) ». `measure-keylabel.py` s'appuie sur
deux ancres — la lettre attendue et la fraction 4/4 qui borne le cadre à
droite — et sur ces trois pages **les deux lâchent** : il propose la rangée
entière (684, 335, 474 px de large) avec une corrélation *négative* sur la
lettre. La mesure à la main est alors mécanique : une bande bornée à gauche
de la fraction, un profil de colonnes, trois amas — « 1 », « = », la lettre —
et la lettre confrontée à `printedKey`. Trois cadres, trois lettres justes.

**Le bémol exposant, et ce qu'il apprend du modèle « une boîte ».**
我们成为一家人 grave « 1= ♭B » à la chinoise, le bémol **au-dessus** de la
lettre, 5 px plus haut que le texte. L'englober dans le cadre porte sa
hauteur de 25 à 55 px — et la hauteur du cadre *est* le corps de la fonte,
chez `overlay.py` (`h * 1,1`) comme chez le client (`fontSize: h/w cqw`). Le
« 1=X » réécrit serait deux fois trop gros. Le cadre tient donc la seule
ligne de texte, et le bémol est effacé à part par une **étiquette au texte
vide** — le même geste que `mask_rows`, employé pour la troisième fois
(rangée étrangère, amas étranger isolé, et maintenant accident
typographique). *Un modèle à une boîte ne peut pas décrire un glyphe qui
sort de la boîte ; il faut alors un second geste, pas un cadre plus grand.*

**Le vocabulaire fermé ne se contente pas de ne rien lire : il publie faux.**
C'est la trouvaille de l'itération. Sur 十字架是我的荣耀, la dernière rangée
imprime « F/C » et « C7 » — **absents du `.cho` **. Le matcher, contraint au
vocabulaire de la page, a rendu le candidat le plus proche : « F/A » et
« G7 ». Unanimes, au-dessus du seuil, comptés comme des réussites. Aucun
compteur ne pouvait les voir — c'est le mode C, et il a fallu l'audit.
`extra_chords` règle exactement ce cas (itération 26, le `C/D` de
旷野中唯一的力量) : les deux accords versés, la lecture passe à F/C et C7 et
**rien d'autre ne bouge** sur la page — vérifié en diffant les 32 étiquettes
avant/après.

丰盛的应许 était la même maladie, en plus grand : cinq accords gravés hors
vocabulaire (C/F, Bb/F, Em7b5, A7, Cm). C'est la page que l'itération 29
avait reportée en disant « c'est un cas `extra_chords`, pas une lecture ».
Une fois le vocabulaire ouvert, `propose-extra --all` sort neuf amas de plus,
dont deux « C/E » que le matcher rendait « C/F » et « Cm ». *Élargir le
vocabulaire ne remplace pas la relecture — il la rend possible.*

**Encore un amas soudé, encore le même remède.** Le « Gm » de 丰盛的应许
touche la liaison qui passe dessous : aucune ligne blanche ne les sépare, et
l'assertion « le bloc ne doit toucher aucun bord » refuse la mesure. La carte
d'encre en ASCII montre la frontière à l'œil nu — le glyphe occupe les lignes
1687-1709, la liaison entre par la droite à 1708 et descend vers la gauche.
Boîte bornée au glyphe ; il reste une entaille de huit pixels dans la
liaison, à comparer avec un accord resté en fa.

**Trois pages certifiées, et la file « PRÊT » est vide.** 握手 (trois « Bm »
que le seuil laissait passer, à 0,38, 0,40 et 0,29), 十字架是我的荣耀 et
丰盛的应许. Ce qui reste dans la file — 你坐着为王, 使命, 我们成为一家人 —
est **entièrement** bloqué par la même chose : un accord à alternative
(`F(或Am)`, `F#m或A`, `F或F/Eb`), décision du 09/08 « laisser ». Le coût de
cette décision est maintenant chiffré : **trois pages complètes par
ailleurs** ne peuvent pas être certifiées, plus 旷野中唯一的力量 et
我们的神 qui butent aussi dessus.

**Bilan.** **31 → 34 certifiés** sur 127, 3158 → **3188** étiquettes, cadres
1=X 60 → **63**. Les trois sont gelées. Contrôle 112/179, FAUX = 0 tenu.
`npx tsc --noEmit` et `npm run validate` passent.

**Ce qui reste.** Plus aucune page « PRÊT » qui ne soit bloquée par `或`.
Le front se déplace donc vers les **41 pages sans calque** et les 52 pages
partielles. Et une question pour Timothée, chiffrée cette fois : voir
ci-dessous.

**Question pour Timothée — les accords à alternative (`或`).** Le 09/08 la
décision était « laisser », et elle était juste : le modèle « une étiquette =
un accord » ne savait pas les rendre. Mais ce n'est plus tout à fait vrai —
il ne s'agit pas de découper l'amas (ce qui échoue toujours : l'arc de
liaison soude, le hanzi colle aux lettres) mais de **réécrire l'étiquette
entière**, « F或F/Eb » → « F#或F#/E », en coupant le texte sur le 或. Cela
demande la même retouche des deux côtés — `transpose_chord` (Python) et
`transposeChord` (`src/lib/transpose.ts`) — et une fonte capable de tracer un
hanzi dans une étiquette d'accord, ce qu'`overlay.py` sait déjà faire pour
`titleKey`. Coût actuel de « laisser » : cinq pages qui ne peuvent pas être
certifiées. Je n'ai rien touché — c'est une décision de produit, pas de
boucle.

### Itération 33 — le compteur ne comptait pas le calque

**Ce qui a débloqué l'itération n'est pas une lecture, c'est un compteur.**
`worklist.py` classait les pages sur `read()` + `keep()` — la sortie brute
du matcher. Les `extra_labels` relues à l'œil, les `corrections`, les
`not_labels` : rien de tout cela n'entrait dans son calcul. Une page qu'on
venait de compléter à la main continuait donc d'afficher « 10 à relire »,
indéfiniment. Le lot de six pages traité en début d'itération — vingt-cinq
amas relus, versés en `extra_labels`, publiés — **n'a pas déplacé une seule
ligne du classement**. C'est ce qui rendait la file « PRÊT » vide à
l'itération 32 : non pas faute de travail fait, mais parce que la métrique
ne savait pas le voir. Le compte se fait maintenant contre `chords.json`,
c'est-à-dire contre ce que le calque publie vraiment : **3 prêts affichés
deviennent 18**.

*C'est la troisième fois que cette boucle rencontre le même défaut sous un
autre visage* (itération 1 : la vérité terrain ne couvrait pas les rangées
ratées ; itération 15 : une rangée jamais détectée n'entre dans aucun
dénominateur ; ici : ce qu'un humain ajoute n'entre dans aucun numérateur).

**Et le verdict « PRÊT » ne valait rien sans son garde-fou.** 让爱走动
affichait 22/22, 100 %, PRÊT. L'audit de page a montré **trois rangées
d'accords entières** jamais converties : la page transposée mêlait deux
tonalités sur cinq systèmes. Le test de rangée cachée existait pourtant —
il demandait que 70 % des amas de la rangée s'apparient au vocabulaire, et
les trois rangées sortaient à 2/4, 3/5 et 4/9. *Une rangée d'accords ne
s'apparie pas mieux que ça quand elle porte un `Bdim/F`, un `D7` à exposant
et un `Cm/D` — c'est-à-dire précisément quand on a besoin du test.*

Descendre la part à 0,40 seul rendrait le test bavard. Le second garde est
le **nombre d'amas**, comme à l'itération 23 : une rangée de chiffres de
cette page en compte une trentaine, une rangée d'accords cinq. Sur le
corpus entier, les deux gardes ensemble sortent **10 rangées sur 7 pages**,
toutes vraies. Et `hidden_rows` regarde désormais le calque : une rangée
que les `extra_labels` couvrent déjà n'est plus « cachée », sans quoi une
page réparée reste marquée pour toujours.

**Trois outils élargis, pour que l'œil voie plus par planche.**
`propose-extra.py` accepte plusieurs chants (une planche de vingt zooms se
lit d'un regard, qu'elle vienne d'une page ou de six) et un mode
`--hidden`, qui ouvre les rangées que le classifieur a rangées ailleurs —
la seule voie vers les pages marquées « rangée cachée ». C'est par là que
les onze rangées de 让爱走动, 十架的爱, 我们是光明之子, 一粒麦子, 大声敬拜 et
好喜欢与你在一起 sont rentrées : **68 étiquettes relues**, dont 20 que le
matcher lisait faux.

**`propose-chords.py` : chercher l'accord absent du `.cho`, mécaniquement.**
L'itération 32 avait trouvé à la main, page par page, que le vocabulaire
fermé ne se contente pas de ne rien lire — il **publie le plus proche**.
Le script rejoue la lecture contre un vocabulaire ouvert (alphabet de
degrés relevé sur tout le corpus, plus les suffixes de la page à tous les
degrés) et signale les amas que l'ouverture lit franchement mieux. Sur les
amas non couverts : 17 propositions, 4 vraies (`Asus4`, `G7`, `F/G`,
`Gmaj7`). En mode `--published`, contre les étiquettes déjà posées : 34
propositions, 3 vraies (为我而来 publiait `Dm7` pour un `Am7` gravé,
爱可以再更多一点点 `Em9` pour `Em7`).

**Et voici ce qu'il faut en dire honnêtement : il n'a pas trouvé les deux
faux accords que l'audit a trouvés.** Sur 握住幸福, la page imprime
`(F#m7b5` et `Fm7`, absents du `.cho` ; le calque publiait `C#m7b5` et
`Em7`, unanimes, au-dessus du seuil. Le mode `--published` les a manqués —
le premier parce que l'ouverture lit `F#dim` plutôt que `F#m7b5`, le second
par la chasse de page. *L'outil réduit le champ ; il ne remplace pas
l'audit.* Et l'audit reste le seul à voir le mode D.

**Le prix d'un vocabulaire élargi, chiffré.** Verser `F#m7b5` et `Fm7` dans
`extra_chords` corrige les deux faux accords — et fait **tomber sept
étiquettes justes** sous le seuil, les `Em7` et `C#m7b5` voisins devenant
ambigus. Les sept se remettent à la main en une planche. C'est le coût réel
de l'ouverture, et il se paie une fois : deux faux accords retirés contre
sept zooms.

**La fonte du cadre « 1=X » était restée à la valeur par défaut.**
`measure-keylabel.py` rendait ses gabarits dans la fonte par défaut, pas
dans celle de la page — la variable que l'itération 19 avait nommée, jamais
appliquée ici. Les vingt-quatre cadres proposés sortaient **tous** avec une
corrélation négative. Corrigé, deux seulement remontent au-dessus de zéro.
Ce n'était donc pas la seule cause : le cadre « 1=X » reste une mesure à la
main, comme à l'itération 32.

**Bilan.** **37 → 38 certifiés** sur 127 (让爱走动), 3323 → **3412**
étiquettes. La file « PRÊT » passe de 3 à **18**, et ce chiffre-là est le
vrai résultat de l'itération : ce qui reste à faire est maintenant visible.
`npx tsc --noEmit` et `npm run validate` passent.

**Ce qui reste, et ce qui bloque.** Sur les 18 prêts, l'audit de 云上太阳 et
de 握住幸福 montre que « prêt » veut dire « bon à auditer », pas « fini » :
云上太阳 cache une rangée d'alternatives parenthésée et un `D/A或D/F#` ;
握住幸福 cache la ligne 【前奏 | G D/F# | …】, noyée dans une rangée d'en-tête
de 147 px que le découpage ne sépare pas.

**Question pour Timothée — les accords à alternative (`或`), le coût a
triplé.** L'itération 32 chiffrait « laisser » à cinq pages. Avec la file
« PRÊT » enfin lisible, on en voit la vraie taille : 你坐着为王, 使命,
我们成为一家人, 我们的神, 云上太阳, 因着十架爱 et 让赞美飞扬 impriment toutes
un `或` (ou un `代替`) dans une rangée d'accords, et aucune ne peut être
certifiée tant qu'il reste dans l'ancienne tonalité — une page à deux
tonalités est pire que pas de calque du tout. **Sept pages prêtes par
ailleurs.** La retouche est la même qu'annoncée : couper le texte de
l'étiquette sur le 或 et transposer les deux moitiés, dans `transpose_chord`
(Python) et `transposeChord` (`src/lib/transpose.ts`). Je n'ai toujours
rien touché — c'est une décision de produit.

### Itération 34 — une étiquette n'est pas un accord, c'est une ligne de texte

**Le blocage n'était pas une lecture, c'était un modèle.** Depuis le 09/08 les
accords à alternative — `F或F/Eb`, « F ou F/Eb » — étaient laissés de côté, et
la raison tenait en une phrase : le calque savait rendre *un accord*, pas *une
étiquette qui en contient deux*. L'itération 32 chiffrait le coût à cinq pages,
l'itération 33 à sept. Décision de produit prise ici : **réécrire**, pas
masquer.

Le retournement est de formuler autrement ce qu'est une étiquette. Non pas « un
accord », mais **une ligne de texte qui contient des accords**. Le transposeur
devient alors un réécriveur : il découpe sur les séparateurs (tout ce qui n'est
pas ASCII — 或, 代替, 先, 后, 【 】 — plus les blancs et la barre de mesure),
teste chaque jeton, transpose ceux qui ont la forme d'un accord et laisse le
reste **verbatim**.

Ainsi posé, `或` cesse d'être un cas particulier. La même fonction couvre d'un
coup les cinq formes que le corpus imprime :

| Gravure | Sens | Rendu (+1 demi-ton) |
|---|---|---|
| `F或F/Eb` | « F ou F/Eb » | `F#或F#/E` |
| `Gm代替Bb` | « Gm à la place de Bb » | `G#m代替B` |
| `先F后F#dim` | « d'abord F puis F#dim » | `先F#后Gdim` |
| `(F C/E D)` | groupe noyé dans une ligne de paroles | `(F# C#/F D#)` |
| `【前奏 \| G D/F# \| … \| D】` | ligne d'intro entière | `【前奏 \| G# D#/G \| … \| D#】` |

*On ne découpe jamais l'image de l'amas* — l'arc de liaison soude les glyphes,
le hanzi colle aux lettres, et quatre itérations ont établi que ça ne marche
pas. On réécrit le texte.

**Les deux gardes qui rendent la chose sûre.** Une étiquette **sans séparateur**
repasse telle quelle par l'ancien chemin : les 3 400 étiquettes déjà publiées
gardent un rendu identique octet pour octet, y compris les formes qu'une
grammaire stricte refuserait (`Am(maj7`). Et le test de jeton est
*volontairement plus strict* que `transpose_chord`, qui accepte n'importe quoi
derrière la fondamentale — sans quoi le « D » de `D.S. al Fine` partirait en
« D# ». `To Chorus`, `Fine` et `【Chorus】` restent verbatim.

La parenthèse orpheline demande un troisième soin : `Dm(` (moitié gauche de
`Dm(或Bb)`) doit être pelée, `Adim(9)` ne doit pas l'être. On ne pèle donc
qu'**en second recours**, après avoir essayé le jeton entier.

Les deux implémentations — `transposeLabel` dans `src/lib/transpose.ts`,
`transpose_label` dans `scripts/jianpu/overlay.py` — donnent le même résultat
sur les vingt-quatre chaînes du corpus, vérifié côte à côte. Elles doivent
bouger ensemble, comme `access.ts` et `firestore.rules`.

**Et la fonte, encore.** Un accord peut désormais porter un hanzi. `overlay.py`
bascule sur la fonte chinoise quand le texte n'est pas ASCII — sinon le
contrôle affiche des tofus, et un contrôle illisible ne contrôle rien. Côté
client, la pile de fontes gagne PingFang / Hiragino / YaHei : sans elles le
repli dépend du système, et le hanzi peut tomber dans une fonte à empattements
au milieu d'une linéale.

**Trouver les composites mécaniquement.** `propose-extra.py --wide` ne garde que
les amas d'au moins quatre hauteurs d'étiquette : un `Dm(或Bb)` en fait onze, un
accord long comme `C#m7b5` en fait trois. Sur le corpus : **90 amas sur 44
pages**, dont une vingtaine de vraies étiquettes composites — le reste étant des
【Chorus】, des `To Chorus` et des crédits, que le réécriveur laisserait de toute
façon intacts.

*Le seuil n'est pas un oracle.* Le `F(或Am)` de 你坐着为王 fait 119 px pour un
plancher à 132 : il est passé sous le filet, et c'est l'audit de page qui l'a
trouvé. Le balayage réduit le champ ; il ne remplace pas l'audit.

**La trouvaille de l'itération : le calque nommait les accords dans la mauvaise
tonalité.** `gold/` nomme comme le `.cho` — c'est ce que rend le matcher, qui
choisit dans le vocabulaire du `.cho` — tandis que `printedKey` est la tonalité
**gravée**, celle dont le client part pour transposer. Sur les 2 pages où les
deux diffèrent, les conventions se croisaient : 好喜欢与你在一起 publiait `F/Eb`
là où la page imprime `G/F`, et **son calque entier sortait deux demi-tons trop
bas** — 36 accords faux, plus 29 sur 永恒唯一的盼望.

Aucun compteur ne pouvait le voir, et c'est ce qui rend le défaut intéressant :
**chaque étiquette était juste dans sa propre convention.** La couverture était
bonne, le contrôle 112/179 intact, `FAUX = 0` tenu. Seule la page rendue
transposée, posée sous l'originale, montrait une ligne entière décalée d'un ton.
La conversion se fait maintenant à la frontière, dans `build-chords` : une seule
convention dans `gold/` (celle du `.cho`, la même qu'`extra_chords`), une seule
dans `chords.json` (celle de la page). Les étiquettes **gelées** en sont
exemptes — `freeze.py` recopie ce que le calque publiait, donc elles sont déjà
dans la tonalité gravée.

**Ce que l'audit a attrapé et que la main avait écrit faux.** Sur 使命, une
étiquette a été versée en recopiant la **lecture du matcher** (`C#m`) au lieu du
**texte imprimé** (`(A/C#)`). La page transposée a montré `Dm` là où `(A#/D)`
devait être. *Le zoom dit ce qui est gravé ; la proposition dit ce que la
machine croit. Recopier la seconde, c'est écrire un mode C à la main.*

**Le mode D était sur cinq des six pages certifiées** — exactement la leçon de
l'itération 29, et elle ne s'use pas :

| Page | Ce que l'audit a montré |
|---|---|
| 使命 | une rangée d'alternatives `(G#m7b5 C#7b9) (D#m7b5)` + 4 étiquettes de rangée |
| 云上太阳 | la rangée parenthésée `(G#m7b5 D/A Asus4 A7)`, entière, jamais détectée |
| 你坐着为王 | un troisième `或` sous le seuil de `--wide` |
| 我们成为一家人 | les deux `F或F/Eb` — tombés de ma propre liste entre la planche et l'écriture |
| 我们的神 | `[最后一遍副歌] [ F#m E/G# D/A A/C# ]`, rangée typée `?` donc jamais lue |

**Bilan.** **38 → 44 certifiés** sur 127 : 让赞美飞扬, 因着十架爱, 云上太阳, 使命,
你坐着为王 et 我们成为一家人. 3412 → **3450** étiquettes.

*Et une correction à porter aux itérations 32 et 33*, qui écrivaient que ces
pages étaient « **entièrement** bloquées » par le `或`. C'était faux, et le
tableau ci-dessus le montre : quatre d'entre elles cachaient aussi une rangée
entière jamais détectée. Le `或` était le blocage **visible** — celui qu'on
pouvait nommer sans ouvrir la page. Les autres n'apparaissaient qu'à l'audit,
une fois le `或` levé et la page enfin auditable. *Un blocage nommé en cache
souvent un autre, non nommé, qu'il empêchait de rencontrer.*

Contrôle 112/179, FAUX = 0 tenu. `npx tsc --noEmit` et `npm run validate`
passent.

**Ce qui reste.**

我们的神 est **en cours, non certifiée** : les quatre étiquettes de la rangée
`[最后一遍副歌]` sont posées et les tranches 1 à 4 relues, pas les suivantes. La
page reste `[PARTIEL]`, donc rien de faux n'est publié comme sûr.

**Une dette nommée : les pages gelées portent aussi des composites.** 明亮晨星
grave `先C后C/E`, 我相信 grave `[回来后G调]`. Elles sont gelées, donc leur calque
ne bouge pas et rien de faux n'est publié aujourd'hui — mais leur page
transposée garde ces mentions dans l'ancienne tonalité. Les dégeler et les
relire est un lot à part entière.

**Et une proposition d'outil, pour la prochaine fois.** L'audit de page rend
huit ou neuf tranches et demande de lire la page entière pour y trouver deux
défauts. Or « un accord sans cadre » est **mécanique** — c'est un amas d'encre
dans une rangée d'accords que le calque ne couvre pas, et `worklist.remaining`
sait déjà le calculer depuis l'itération 33. `audit-page.py` devrait ne rendre
que **les tranches qui contiennent un suspect** et lister les autres en une
ligne. Sur 我们的神 cela aurait fait 1 tranche au lieu de 9. C'est le même geste
que partout ailleurs dans cette boucle : l'outil réduit le champ, l'œil tranche
— mais sur ce qui reste, pas sur tout.

### Itération 35 — la bonne réponse n'était pas sur le bulletin

**Le cadre « 1=X » bloquait huit pages prêtes, et on croyait que c'était un
problème de score.** L'itération 33 l'avait noté sans creuser : les
vingt-quatre cadres proposés sortaient presque tous en corrélation négative,
la fonte a été corrigée, deux seulement sont remontés au-dessus de zéro, et
la conclusion tirée fut « le cadre reste une mesure à la main ». Le contrôle
visuel dit autre chose. Sur les vingt-quatre : **deux justes, vingt-deux
faux** — six rangées d'accords, sept rangées de chiffres, quatre lignes de
paroles, cinq lignes de tempo. Et le seul vraiment lisible des deux
(`F=1 4/4` sur 你们要赞美耶和华) notait **−1,52** : il aurait été rejeté par
n'importe quel plancher. Le mieux classé, à +0,21, était une rangée
d'accords.

Trois défauts s'additionnaient, et le troisième cachait les deux premiers :

- **le filtre de hauteur supprimait la bonne bande.** Le découpage ne gardait
  que les bandes de 18 à 95 px. Sur les gravures serrées, le libellé se colle
  au bloc de sous-titre au-dessus et tout part ensemble : 165 px sur
  一切歌颂赞美, 136 sur 脚步, 132 sur 你们要赞美耶和华. La bande contenant la
  réponse n'était pas mal notée — **elle n'était pas candidate** ;
- **aucun plancher.** L'argmax rendait une boîte pour chaque page, y compris
  celles dont toutes les candidates étaient à jeter. *Un score qu'on ne
  confronte jamais à un plancher n'est pas une mesure, c'est un classement* —
  et classer ne sert à rien quand la bonne réponse a été retirée du scrutin ;
- **le vote portait sur la lettre attendue**, c'est-à-dire sur exactement ce
  dont une rangée d'accords est faite. `D/F#` contient un `D` ; il gagnait le
  vote de `printedKey = D`. L'oracle confirmait le parasite.

**Ce qu'on ancre maintenant : le glyphe `=`.** C'est le seul invariant du
libellé — deux barres horizontales de même chasse, empilées, isolées
au-dessus et au-dessous. Il se cherche sur l'encre brute, sans découpage
préalable, donc aucun filtre ne peut le faire disparaître ; et le cadre est
ensuite l'étendue « voisin de gauche … voisin de droite » sur la même ligne,
ce qui donne `1=F` **sans la fraction 4/4**. La ligne de tempo `♩=NN` porte le
même `=` et sort donc aussi : on ne la filtre pas, elle va sur la planche
comme les autres et l'œil tranche en un regard. *L'automate propose toutes
les candidates ; c'est l'œil qui en élit une* — l'ancienne version élisait
elle-même et ne laissait à l'œil qu'un vote de ratification.

**Et l'écart toléré se mesure sur la ligne, pas sur le `=`.** Premier jet :
14 libellés sur 24 pages. Les manques avaient une cause commune et nette —
un `=` fait 10 px quand sa ligne en fait 26, et les gravures écrivent
volontiers `1=  G` avec trente pixels de blanc avant la lettre. Calé sur la
hauteur du `=`, l'écart admis valait 22 px : la lettre tombait hors de
portée et le libellé était rejeté **faute de voisin**, alors que son `=`
avait bien été trouvé. Recalé sur la hauteur du « 1 », il récupère
一切歌颂赞美, 大声敬拜, 我安然居住, 认识你真好, et deux pages qui ne
rendaient **aucune** candidate — 一粒麦子 et 在这里 : **20 sur 24**.

**L'audit des 67 cadres déjà publiés, et ce qu'il a trouvé.** Chaque cadre
recadré et posé sur une planche, la lettre gravée confrontée à `printedKey`.
Soixante-cinq sont justes. Un ne l'est pas, et il est en production depuis
l'itération 11 : sur **齐来赞美 — page certifiée** — le cadre mesurait
134 × 51 px et englobait la fraction **4/4**, que le masque effaçait de la
page. Le rendu transposé le montre sans discussion : chiffrage de mesure
disparu, et le libellé écrit au double de sa taille puisque le client tire la
taille du texte de la hauteur du cadre. Mesuré sur l'encre — « 1 » x=6-20,
« = » x=25-40, « F » x=71-84, la fraction commence à x=117 — le cadre juste
fait 79 × 26. *Aucun compteur ne pouvait le voir : un cadre est juste ou faux,
il n'entre dans aucun rapport.*

*Une correction de méthode, sur laquelle je me suis moi-même trompé en
cours d'audit.* Sur 我们成为一家人, la planche montrait le bémol exposant de
« 1= ♭B » hors du cadre, et j'ai cru à un second défaut du même genre. Il
n'en était rien : l'itération 34 l'avait déjà masqué à part, par une
`extra_labels` à texte vide, et le `verified` de la page le dit. **Ma planche
recadrait le scan, pas le calque** — elle ne pouvait donc pas montrer un
défaut corrigé comme corrigé. Auditer l'original pour juger le rendu est une
faute de mesure ; c'est `compare-render` et `audit-page` qui superposent les
deux, et c'est pour ça qu'ils existent.

**La trouvaille de l'itération : `printedKey` porte deux sens qui ne
coïncident pas toujours.** Sur 十架的爱, la page grave **`1=F`** — le nouveau
détecteur le lit, la planche le confirme — tandis que `printedKey` vaut `D`,
la tonalité du `.cho` et celle des accords imprimés (`D/F#`, `G`, `Bm`, qui
sont des positions de capo 3). Les deux sont justes, chacun dans son registre :
`D` est la tonalité des **accords**, `F` est le **do du 简谱**. Mais le client
écrit `1=<tonalité jouée>` dans le cadre, en partant de `printedKey` : poser
un cadre ici remplacerait un `1=F` juste par un `1=D` faux, et **les chiffres
de toute la page se liraient trois demi-tons à côté**. C'est pire qu'un accord
faux — un accord faux se corrige à l'oreille, une clé de lecture fausse
invalide la page entière.

Le cadre de 十架的爱 est donc mesuré et **volontairement non publié**, la
raison écrite dans son `gold/`. Et `worklist` sait désormais distinguer un
cadre *écarté* d'un cadre *à mesurer* : sans ça il le redemanderait à chaque
tour — le défaut exact de l'itération 33, où la file ne voyait pas le travail
déjà fait.

**Bilan.** Cadres « 1=X » **67 → 86**, dont un repris. Le blocage « cadre à
mesurer » de la file « PRÊT » passe de **8 pages à 1** (赞美之泉, dont le
libellé n'est toujours pas trouvé). Certifiés **44 sur 127** et 3450
étiquettes, tous deux inchangés : un cadre ne certifie rien, il lève un
verrou. `npx tsc --noEmit` et `npm run validate` passent.

**Ce qui reste, nommé.** Quatre pages sur vingt-quatre n'ont toujours pas de
libellé lu : 一生跟随, 你们要赞美耶和华, 哦十字架 et 赞美之泉. Une cause
identifiée — le `=` **italique** de `F=1` (barres obliques, ordre inversé) sur
你们要赞美耶和华 ; sur les trois autres, seule la ligne de tempo sort, donc le
libellé est hors de la fenêtre haut-gauche ou sa gravure ne donne pas deux
barres jumelles. Aucune ne demande un meilleur score ; toutes demandent que la
candidate existe.

**Question pour Timothée — faut-il un champ pour le do gravé ?** Une seule
page est concernée aujourd'hui (十架的爱), et je n'ai touché à rien. Le
correctif tient en un champ optionnel dans `gold/` (`printed_do`, par défaut
égal à `printed_key`) que `build-chords` publierait à côté de `printedKey`,
et une ligne dans `JianpuSheet.tsx` pour que le libellé transpose **le do**
et non la tonalité des accords. Le même champ réparerait aussi la phrase de
repli du client, qui affirme aujourd'hui « comme l'indication « 1=D » en haut
de page » sur une page qui imprime `1=F`. *Une page pour l'instant — mais
c'est la seule dont on ait lu le libellé et confronté la lettre ; les 43
pages sans cadre n'ont jamais été regardées sous cet angle.*

### Itération 36 — deux pages de bout en bout, et la voisine qui rogne

Demande directe : faire le 简谱 de 我们呼求 et 我能给你什么, PDF fournis. Les
deux scans étaient déjà au corpus ; ce qui manquait était le calque.

**Ce que les compteurs disaient.** 我们呼求 : 24 amas lus sur 49, soit 49 %,
sous le plancher de `MIN_COVERAGE` — donc **aucun calque publié**, donc
invisible à `worklist` et à `propose-extra`, qui partent tous deux de
`chords.json`. Une page sans calque n'a pas de file d'attente : elle n'existe
pour aucun outil de la boucle. 我能给你什么 : 31/48, « 17 à relire ».

**Ce que l'œil a vu, et que les compteurs ne pouvaient pas voir.**

- **Mode D, une rangée par page.** Sur 我们呼求, la **2ᵉ ligne d'intro**
  (`F#m Bm E/G# D A`) est classée « ? » : ses étiquettes sont plus petites
  que celles des couplets et la rangée est haute de 19 px. Sur
  我能给你什么, deux rangées manquées, toutes deux des **alternatives
  parenthésées** — « ( Em7b5   A7 ) » sous le premier système et « (C/Bb) »
  sous le refrain — classées « chords? » parce qu'aucune rangée de chiffres
  ne les suit. Ce sont des accords à jouer, pas des annotations : les
  laisser gravés maintenait les deux pages à deux tonalités.

- **Mode C, sur une lecture retenue.** 我能给你什么 publiait `F7` à +0,32,
  unanime, là où la page grave `G7` (y=1466, x=1174). Ni le score ni le jury
  ne le signalaient ; seule la tranche d'audit, `G7` en haut et `F#7` en bas,
  le montre. `corrections` ne pouvait pas le réparer — il ne comble que les
  trous — il a fallu `not_labels` puis une étiquette reposée à la main.

- **Un mode nouveau : la voisine qui rogne.** Les deux pages ont des groupes
  d'accords serrés (`A7/E G/A A7 D`, `Csus4 Bb/D C/E`, `( Em7b5   A7 )`).
  Une fois transposés, les noms cibles sont plus larges que les gravés, et
  **le fond opaque de l'étiquette suivante recouvre la fin de la
  précédente** : « A#7/F G#/A# A#7 D# » sortait « A#7/ G#/. A#D# » — deux
  basses perdues, alors que chaque étiquette est juste, publiée, encadrée et
  comptée comme réussite. Aucune métrique ne l'attrape : les compteurs
  comptent des étiquettes, pas des pixels visibles. L'**étiquette composite**
  de l'itération 34, qui existait pour les `或` et les groupes parenthésés,
  est le remède : un seul fond, un seul texte, rien qui recouvre rien.

- **La boîte de rangée efface la musique.** Le dernier système de
  我能给你什么 mêle deux niveaux d'écriture (`Csus4 Bb/D C/E` et `Gm7 F/A`
  au-dessus des crochets de reprise ⌐1/⌐2, `Bbm C7 F` en dessous) et les
  crochets eux-mêmes : le découpage soude « Csus4 Bb/D C/E + ⌐1 + Gm7 » en
  un amas de 383 px et ne retient du `F` final qu'un éclat de 3 px. Publier
  avec la boîte de rangée (h=48) aurait **effacé les crochets de reprise**.
  La rangée est donc écartée par `not_rows` et ses huit accords reposés à la
  main, boîte par boîte, sur les profils d'encre.

**Bilan.** 我们呼求 : 41/41 lus (19 corrigés), 7 étiquettes posées à la main,
cadre `1=A` mesuré, 48 étiquettes gelées. 我能给你什么 : 40/40 lus (12
corrigés), 10 posées à la main, cadre `1=F` déjà là, mention « （F调） » du
titre ajoutée en `title_key`, 50 étiquettes gelées. Certifiés **44 → 46 sur
127**, calques **91 → 92**, étiquettes **3450 → 3517**. Les deux pages ont été
auditées entièrement (9 et 8 tranches), un demi-ton au-dessus.

**Ce qui reste, nommé.** `labelH` est la médiane des **hauteurs de rangée**,
et une rangée vaut le haut du glyphe le plus haut. Sur 我们呼求, dont la
gravure met le ♯ en **exposant** au-dessus de la lettre, la rangée fait 29 px
quand la capitale n'en fait que 19 : le calque réécrit donc les accords
environ 50 % trop gros. Le rendu reste juste et lisible — c'est ce que fait
tout le corpus, 云上太阳 (certifiée) est à +39 % — mais c'est aussi ce qui
rapproche les étiquettes et provoque le rognage ci-dessus. Mesurer `labelH`
sur la **hauteur de capitale** plutôt que sur la boîte de rangée le
corrigerait partout d'un coup ; je n'y ai pas touché, ça déplacerait 92
calques dont 46 certifiés.

### Itération 37 — la rangée que le matcher refuse n'existe plus pour personne

**Le point de départ était un outil, la trouvaille est une fuite.** L'itération 34
laissait une proposition : `audit-page.py` devrait ne rendre que les tranches
portant un suspect, puisque « un accord sans cadre » est mécanique — un amas
d'encre d'une rangée d'accords que `chords.json` ne couvre pas, et
`worklist.remaining` sait déjà le calculer. La fonction est donc extraite
(`worklist.suspects`), les boîtes **encadrées en rouge sur l'original**, et
`--suspects` restreint les tranches.

*Mais le mode par défaut reste la page entière*, et c'est délibéré : les
suspects ne disent rien du **mode C**, une lecture fausse mais couverte, qui
n'a par définition aucun suspect. Réduire les tranches ferait gagner du temps
en aveuglant le seul contrôle qui voie ce mode-là. Les cadres réduisent le
champ ; ils ne réduisent pas la page.

La première page auditée avec ces cadres — 认识你真好, **27/27, 100 %, la seule
page du corpus à couverture pleine** — a montré la fuite tout de suite :
**trois rangées d'accords entières, aucune encadrée**, donc aucune suspecte.

| Rangée | Ce qu'elle grave | Comment le classifieur la range |
|---|---|---|
| y=892 | `(C)` | `chords?` — un seul amas |
| y=1208 | `(C  D  C/E  D/F#)` | `?` |
| y=1282 | `(Am  G/B  C  D)` | `chords?` |

**Le trou, et il était structurel.** `crop_labels` ne rend une rangée `chords?`
que si `confirm_candidates` la confirme. Et `hidden_rows` saute **toutes** les
`chords?`, sur ce commentaire écrit à l'itération 22 : « elle est déjà dans le
circuit, donc elle n'est pas cachée ». C'est vrai quand le matcher la confirme.
Quand il l'**écarte**, elle sort des deux côtés à la fois : pas dans la lecture,
pas dans les rangées cachées, dans aucun dénominateur. *Le classifieur propose,
le matcher dispose — mais rien ne comptait ce que le matcher jetait.*

**Et une fois la porte ouverte, il fallait encore savoir lire.** Le test de
rangée cachée apparie les amas au vocabulaire ; or le découpage soude la
parenthèse au nom (`(C`, `D/F#)`, `( Em7b5`), et une signature de `(Am` ne
ressemble à aucun gabarit. Une rangée d'alternatives n'apparie donc rien — c'est
exactement pourquoi les itérations 29, 34 et 36 ne les ont trouvées qu'à l'œil,
page après page. Le banc gagne les formes flanquées de leur parenthèse
(`detector_bank`), et `(Am` passe de +0,19 à +0,62.

*Deux bancs, deux réglages, et c'est le seul motif.* `face_bank` **publie** :
un faux positif y écrit un faux accord. `detector_bank` **détecte** : un faux
positif y coûte une planche à regarder. Les deux erreurs n'ont pas le même prix.
Mesuré sur le corpus, le banc élargi ne réveille que **trois** rangées — et deux
d'entre elles étaient sur des pages notées PRÊT. Un balayage des **47 pages déjà
certifiées** n'en réveille aucune.

**Ce que le banc élargi n'attrape toujours pas**, et il faut l'écrire : sur
认识你真好 il voit une des trois rangées, pas les deux autres — `(C)` est seule
dans sa rangée (le test demande trois amas), et `(C  D  C/E  D/F#)` reste à
1 amas apparié sur 4. Cela suffit à **empêcher la certification**, ce qui est le
travail de la file ; cela ne remplace pas l'audit, qui a trouvé les deux autres.

**Trente-neuf clés mortes.** En écrivant un `not_labels` sur 握住幸福 j'ai vu que
la clé existante, `"1004,1022"`, ne correspondait à aucune rangée : le code lit
`"{top},{x0}"`, elle était écrite `"x,y"`. Le test passé à tout le corpus en
sort **39, sur 15 pages** — 你恩典不离开, 信实的神, 奇异恩典, 如鹰展翅上腾,
尽情地微笑, 尽情的敬拜, 我们的神, 我们高举耶稣的名, 我心坚定与你, 我相信, 握住幸福,
旷野中唯一的力量, 明亮晨星, 献上尊荣, 耶和华是应当称颂的. Chacune désigne pourtant
un amas réel dans l'ordre inverse, ce qui les rend réparables mécaniquement.
Aucune n'était publiée : le calque est donc juste aujourd'hui, et `chords.json`
ne bouge pas d'un octet après la réparation. Ce qu'elles coûtaient est ailleurs —
un amas qu'on a jugé « pas une étiquette » restait un suspect à vie, donc sa page
restait inaudible. *Une note qui n'est pas au bon endroit ne dit rien, et rien ne
le signale : une clé fausse ne lève aucune erreur, elle ne matche simplement
jamais.*

**Deux trous dans la grammaire de jeton.** `transpose_label` découpe une ligne
et n'accepte de transposer qu'un jeton qui a *la forme* d'un accord — sévérité
voulue, sans quoi le « D » de `D.S. al Fine` partirait. Deux formes lui
manquaient, et les deux sont apparues en écrivant les composites de cette
itération :

- **la basse seule.** 我安然居住 grave une ligne de basse descendante en ne
  répétant pas l'accord : `D/F#  /F  B/D#`. Le `/F` sortait verbatim **au milieu
  d'une étiquette dont le reste était transposé** ;
- **l'enrichissement entre parenthèses qui commence par une lettre.**
  `Adim(9)` passait, `Am(maj7)` non. Isolé il s'en tirait par l'ancien chemin ;
  dès qu'il partageait une étiquette avec un autre accord, il restait tel quel.

La grammaire élargie a été mesurée avant d'être écrite : sur les **3 544
étiquettes publiées, aux douze transpositions, elle n'en change aucune.** Les
deux implémentations bougent ensemble (`overlay.py`, `src/lib/transpose.ts`), et
les cinq cas nouveaux sont versés au banc d'essai.

**`fh` — le corps propre à une étiquette.** 握住幸福 grave sa ligne d'intro
`【前奏 | G D/F# | … | D】` sur 702 px ; réécrite au corps de la page elle en
prend 1 322 et **recouvre les crédits**. Ce n'est pas un défaut de la ligne mais
de `labelH`, qui est la médiane des **hauteurs de rangée** — la dette nommée à la
fin de l'itération 36. La corriger partout déplacerait 92 calques dont 49
certifiés ; on ajoute donc un champ facultatif, `fh`, que le rendu utilise à la
place de `labelH` sur cette étiquette-là. Absent, rien ne change : les 3 500
étiquettes déjà publiées gardent leur corps. Il se cale en rendant le texte
**d'origine** à plusieurs corps et en retenant celui qui retrouve la largeur
gravée. Il traverse `build-chords`, `freeze`, `overlay.py`, `JianpuSheet.tsx` et
`SongPDF.tsx` — la même règle que `access.ts` / `firestore.rules`.

*Le gel l'a mangé une fois.* `build-chords` republie une page gelée en ne
recopiant que `x,y,w,h,c` : les deux pages certifiées de cette itération ont
donc perdu leur `fh` **entre l'audit et le gel**, et l'intro de 握住幸福 est
repartie en travers des crédits. Rien ne le signalait — le calque restait valide,
seule la relecture après gel le montre. *Un champ facultatif se perd à chaque
recopie qui ne le connaît pas ; il faut le nommer partout où l'on recopie.*

*Et en le câblant, une correction due à l'itération 34* : `SongPDF.tsx`
appelait encore `transposeChord` et non `transposeLabel`. Depuis que le calque
publie des lignes entières, le **PDF** rendait donc `(Am G/B C D)` et
`【前奏 | … 】` verbatim. Une étiquette sans séparateur repasse par le même chemin
qu'avant, donc rien d'autre ne bouge.

**Les trois pages, et ce que chacune a appris.**

*认识你真好* — trois rangées parenthésées posées, les deux groupes en étiquette
**composite** : posés amas par amas, les noms cibles se rognaient
(`C#/F D#/G)` sortait `C#/FD#/G)`).

*握住幸福* — quatre familles d'un coup. La rangée `( C#m7b5 Am7 Am/G Cm6/Eb D)`
jamais détectée ; la **ligne d'intro**, noyée dans un bandeau d'en-tête typé
`numbers`, que ni la couverture, ni les rangées cachées, ni les suspects ne
peuvent atteindre ; un groupe `(F  C/E  D)` **noyé dans une ligne de paroles**,
même angle mort ; six groupes serrés réunis en composites, dont un où le rognage
effaçait le « m » de `D#m` — *un accord faux, pas seulement illisible* ; et un
**mode C** : la page grave `C#m7b5`, le calque publiait `F#m7b5`, le mot ajouté
au vocabulaire à l'itération 33 pour le `(F#m7b5` d'une autre rangée. Retenu,
unanime, compté comme réussite. Seule la page transposée le montre.
L'annotation `[另有一张F调]` reste verbatim : elle désigne **une autre
partition**, qui ne se transpose pas avec celle-ci.

*我安然居住* — la rangée y=1614 (13 amas) entièrement manquée, plus trois autres :
un `(C/D)` isolé, une rangée d'accords noyée dans un bandeau `numbers`, un
`[尾句2] Em7 A9b13` typé `?`. Sept composites. C'est elle qui a fait sortir les
deux trous de grammaire.

**Bilan.** Certifiés **46 → 49 sur 127**, étiquettes 3517 → **3541**, calques 92
et cadres 1=X 87 inchangés. Contrôle 112/179, `FAUX = 0` tenu. `npx tsc --noEmit`,
`npm run validate` et `npm run lint` passent (49 avertissements préexistants,
0 erreur).

**Ce qui reste, nommé.**

- La file affiche **11 prêts** et **0 rangée cachée**. Après cette itération, ce
  zéro veut dire moins qu'avant : le test voit désormais les parenthésées, mais
  il lui faut trois amas et 40 % d'appariement. Une rangée d'un ou deux accords
  lui échappe encore par construction.
- **Aucun test n'atteint une rangée d'accords noyée dans un bandeau typé
  `numbers` ou `lyrics`** — l'intro de 握住幸福, le `(F C/E D)` dans ses paroles,
  la rangée y≈1310 de 我安然居住. Trois cas sur deux pages, tous trouvés à l'œil.
  C'est le mode D dans sa forme la plus dure : il ne s'agit pas d'une rangée mal
  classée mais d'une rangée que le **découpage** n'a jamais isolée. Le remède
  serait de chercher les accords **sous** la rangée, sur l'encre brute, comme
  `measure-keylabel` s'ancre sur le glyphe `=` (itération 35) — c'est le geste
  qui a marché la dernière fois qu'un filtre supprimait la bonne candidate.
- **`labelH` reste mesuré sur la boîte de rangée**, donc trop grand d'environ un
  quart sur les pages testées ici (27 pour 22 sur 握住幸福, 28 pour 22 sur
  我安然居住). `fh` le corrige étiquette par étiquette ; la vraie réparation est
  de mesurer sur la hauteur de capitale, et elle déplacerait tout le corpus.


### Itération 38 — le corps des accords se mesure, il ne se devine pas

**Le contrôle visuel passe au navigateur.** Les rendus PIL de `scripts/jianpu/`
redessinent la page *à côté* du composant réel : ils ne voient ni le fond
opaque qui rogne l'étiquette voisine, ni l'accord qui sort de la page, ni le
thème sombre. Trois outils Playwright les remplacent — `audit-browser.ts` pour
la planche, `sweep-browser.ts` pour le balayage, `zoom-browser.ts` pour
grossir une étiquette — plus un banc de tests qui mécanise l'oracle de la
transposition sur les 49 certifiées.

Deux pièges avant que quoi que ce soit fonctionne : `next dev` **bloque ses
ressources en cross-origin**, donc une page ouverte sur `127.0.0.1` s'affiche
mais n'est **pas hydratée** — aucun bouton ne répond, le bouton 简谱
n'apparaît jamais ; et la page chant lit ses paramètres d'URL **en JSON**,
donc `?key=F` est ignoré en silence et la partition reste en tonalité
d'origine. Un test qui ignore l'un ou l'autre mesure autre chose que ce qu'il
croit.

**Ce que le navigateur a vu et qu'aucun compteur ne voyait.** Sur un tiers des
pages, les accords réécrits sont **nettement plus gros que les gravés** —
jusqu'à 1,4×. Ils se recouvrent, avalent ce qui est imprimé à côté, et cinq
sortent de la page. Le premier balayage : 97 chevauchements, 83 recouvrements
d'encre, 15 pages propres sur 49.

**Le percentile bas ne suffit pas — `h` ne veut pas dire la même chose d'une
page à l'autre.** Sur 让爱走动 c'est la grappe d'encre, et le *même* « G » est
relevé entre 23 et 39 px selon qu'une liaison le touche ; sur
主我献上生命给你 **toutes** les boîtes valent 31 alors que le texte en fait 24
— c'est la bande de rangée. Aucun quantile ne sépare les deux : le p25
corrigeait 献上尊荣 et laissait les deux autres à 1,3×.

`text_height()` mesure donc le texte : dans chaque boîte, la plus longue bande
de lignes dont l'encre atteint 15 % de la ligne la plus noire — les lettres
passent, une liaison, fine et peu dense, non. 3ᵉ quartile, **borné par la
boîte** (sinon les gravures d'hymnaire à 14 px attrapent la rangée de chiffres
en dessous). Calibré sur six pages : il retrouve au pixel près la valeur des
pages déjà justes (不停赞美 28, 一生爱你 22) et coupe les autres (让爱走动
32 → 24, 献上尊荣 34 → 26). C'est la réparation que l'itération 37 avait
nommée sans la faire.

**Ce qui restait n'était pas une histoire de taille.** Un nom transposé est
souvent plus long que le gravé — `F/A` devient `Gb/Bb` — et le fond opaque,
ancré à gauche, s'élargit sur ce qui est imprimé à côté. Le zoom a tranché ce
que « encre couverte » voulait dire : sur 让爱走动 ce sont les **barres
verticales** de la ligne d'intro « G | Fadd2 | C/E | Cm/Eb », effacées une à
une — le rendu donnait `Ab| Gbadd2Db/FDbm/E`. Regarder les seules étiquettes
voisines ne les aurait jamais vues ; `sp` est donc mesuré **sur l'encre**, et
l'étiquette réduit son corps jusqu'à tenir dedans (plancher 0,80×, en dessous
duquel un accord devient moins lisible que gênant).

**Et la bande de mesure doit être celle que le fond efface, pas celle du
texte.** Mesurée sur les seules lignes d'encre dense, `sp` laissait passer ce
qui est gravé un peu plus haut ou plus bas dans la même bande. Alignée sur la
boîte réelle du client (`y - 6` à `y + h +` descendante), l'encre couverte
tombe de **34 à 9** et les pages propres montent de 28 à 35.

**Ce qui reste** (19 chevauchements, 9 recouvrements) est en grande partie de
la **donnée**, pas du rendu : des étiquettes quasi identiques pour le même
accord, deux relevés du même endroit à quelques pixels près. Les doublons
*exacts* — 74, sur 3 pages certifiées — sont maintenant retirés au build ;
les quasi-doublons demandent l'œil, page par page.


### Itération 39 — la rangée soudée à ses chiffres

**Le trou était nommé depuis l'itération 37, il n'était pas bouché.** « Aucun
test n'atteint une rangée d'accords noyée dans un bandeau typé `numbers` ou
`lyrics` » — trois cas sur deux pages, tous trouvés à l'œil, page après page.
`hidden_rows` ne pouvait rien pour eux : il teste une **bande entière**, et
dans une bande soudée chaque amas porte à la fois la lettre et le chiffre, donc
plus rien ne s'apparie.

*La coupure existe, elle est simplement trop peu marquée.* Sur 我安然居住, entre
les accords et les chiffres de la bande y=1288-1364, la couverture d'encre tombe
à 0,0087 pour un plancher de `split_band` à 0,0073. Le creux est là ; le seuil
qui l'attraperait couperait les rangées de chiffres en deux. **Encore un seuil
qui ne sépare rien**, et c'est la troisième fois que la boucle bute dessus
(itérations 22, 23, 35).

**On ne cherche donc pas la coupure, on cherche les accords.** Une fenêtre de la
hauteur d'une rangée d'accords *de cette page* est promenée dans la bande, de
quatre en quatre pixels ; à chaque position on découpe les amas et on les
apparie. C'est le geste de `measure-keylabel` (itération 35), qui s'ancre sur le
glyphe `=` au lieu d'attendre que le découpage lui donne la bonne bande — le
geste qui a marché la dernière fois qu'un filtre supprimait la bonne candidate.

Le signal est franc, et c'est ce qui rend le test utilisable : sur 我安然居住 la
bonne fenêtre sort à **5/7 appariés**, quand les bandes de paroles de la même
page plafonnent à 0 et les autres bandes de chiffres à 11 %.

**La part se compte sur ce qui n'est pas déjà publié.** Premier jet : trois
pages certifiées signalées, dont deux à tort — 到各山岭去传扬, dont la fenêtre
tenait deux accords **convertis depuis l'itération 11** et trois chiffres,
appariait 2/5 et passait le seuil. Le calque n'est pas un dénominateur : les
amas qu'il couvre sortent du compte, et les deux faux positifs disparaissent
sans toucher au seuil.

**Ce qu'il a trouvé.** Six rangées vraies sur les 92 pages à calque, toutes
confirmées sur le scan :

| Page | État | Ce que la rangée grave |
|---|---|---|
| 全新的你 | **certifiée** | `F  C/E  Dm  G7  C` |
| 大声敬拜 | **PRÊT** | `G  Em  D  D` |
| 我们欢迎君王降临 | à relire | `F  C/E  Am  Dm` et `F  Dm  B♭  B♭/C` |
| 爱的彰显 | à relire | `D  D  C  D` |

*Et la première est la plus grave.* 全新的你 est certifiée depuis le 5 août, sa
phrase `verified` disant « aucun accord resté en C ». La planche navigateur
montre sa dernière rangée transposée en `Gb  C/E  Dm  Ab7  C` : **deux accords
convertis sur cinq**, trois restés dans l'ancienne tonalité, la page mélangeant
deux tonalités dans une même mesure. Ni le banc de transposition — qui ne juge
que les étiquettes **publiées** —, ni la couverture — qui ne compte que dans les
rangées **trouvées** —, ni `compare-render`, ni la file (qui saute les pages
certifiées, et c'est son travail) ne pouvaient le voir. *Une rangée jamais
détectée n'entre dans aucun dénominateur : c'est la phrase du mode D depuis
l'itération 15, et elle vient de rattraper une page certifiée.*

D'où `worklist.py --certifiées`, qui rejoue la chasse sur les pages finies. Il
en reste zéro après réparation.

**Le doublon qui n'est pas exact.** L'itération 38 retirait les doublons de
**boîte exacte**. Le corpus en portait 14 autres, sur 6 pages, sous deux formes :
la même rangée relue à trois pixels près (l'un se dessine sur l'autre, l'œil ne
voit rien, mais les deux fonds faussent toute mesure de recouvrement), et
l'accord isolé **resté sous le composite** qui l'a remplacé à l'itération 34 —
`Em7` sous `Em7 Dm G)`, `Am7` et `Am(maj7)` sous `Am7  Am(maj7)`. Là, c'est le
texte lui-même qui est écrit deux fois, l'un par-dessus l'autre.

L'invariant est celui de la page, pas un seuil : **une gravure sépare ses
étiquettes**, et les boîtes sortent des amas de colonnes, donc deux étiquettes
gravées ne se recouvrent jamais. Mesuré, le compte est le même — 14 — que l'on
demande un pixel commun ou cinq : il n'y a aucun cas limite à arbitrer. Le
relevé le plus large gagne (le composite l'emporte sur l'accord isolé) ; à
largeur égale, la boîte la plus basse, puisque la plus haute a happé ce qui
touchait l'étiquette. `labelH` ne bouge sur aucune page — la mesure de
l'itération 38 était déjà robuste aux doublons.

**Bilan.** Certifiés **49 → 50 sur 127** (大声敬拜 certifiée, 全新的你 réparée et
re-auditée), étiquettes 3467 → **3462** (−14 doublons, +9 rangées relues),
calques 92 et cadres 1=X 87 inchangés. Le balayage navigateur passe de **75 à
80 pages sans défaut sur 92** ; les 201 tests Playwright des 50 certifiées
passent. `npx tsc --noEmit`, `npm run validate` et `npm run lint` passent
(49 avertissements préexistants, 0 erreur).

**Ce qui reste, nommé.**

- **Deux pages portent encore une rangée soudée** — 我们欢迎君王降临 (deux
  rangées) et 爱的彰显 —, lues et confirmées sur le scan mais pas encore
  relevées. Elles demandent la passe de lecture complète de leur page, pas
  seulement la rangée.
- Le détecteur **ne voit pas la ligne d'intro de 握住幸福** (`【前奏 | G D/F# | …
  | D】`, 3 amas appariés sur 10) : une ligne composite mêle hanzi, barres et
  accords, et aucune part d'appariement ne l'en sépare. C'est la même limite que
  `--wide` a contournée en cherchant les amas **larges** plutôt que les amas
  lisibles ; les deux tests restent complémentaires.
- Les **11 « encre couverte » restants** du balayage sont le plancher de
  rétrécissement à 0,80× assumé à l'itération 38, pas un défaut nouveau : sous ce
  facteur un accord devient moins lisible qu'il n'est gênant. Ce qui les
  produirait vraiment moins, c'est un fond opaque **centré sur le gravé** plutôt
  qu'ancré à gauche — un changement qui déplacerait les 3 462 étiquettes.
- `labelH` reste **une valeur par page**. Les 4 chevauchements restants du
  balayage sont des voisins réels dont les noms transposés se rejoignent
  (`Db/Gb ∩ B/Gb`, `F2 ∩ (F/A`) : c'est de la place manquante, pas du doublon.


### Itération 40 — la page qui annonce deux tonalités, et l'étiquette écrite dans la mauvaise convention

**Ce que l'itération 39 laissait nommé est fait.** Les deux pages à rangée
soudée — 我们欢迎君王降临 (deux rangées) et 爱的彰显 (une) — ont été reprises
page entière, à la boîte d'encre près : 18 étiquettes pour la première, 4 pour
la seconde. Les rangées soudées n'étaient d'ailleurs pas le plus gros du
travail : sur 我们欢迎君王降临, **14 des 18 manquantes étaient dans des rangées
que le classifieur avait bien trouvées** — toutes les basses en si♭ (`B♭`,
`C/B♭`, `B♭/C`), que le matcher n'appariait pas. Le mode D avait masqué un
simple trou de lecture.

**Le second cadre « 1=X ».** 我们的神 et 旷野中唯一的力量 changent de ton au
dernier refrain et l'écrivent **dans la portée**, entre deux barres de mesure :
`|1= A|`, `|1= G|`. Personne ne les voyait. Pas le matcher — « 1= G » n'est pas
un accord. Pas la couverture — l'amas n'est dans aucune rangée d'accords. Pas
`measure-keylabel`, qui ne regarde que les 30 % du haut sur les 45 % de gauche.
Pas le banc de transposition, qui ne juge que les étiquettes publiées. Et pas
`chords.json`, qui ne tient qu'**un** `keyLabel` par page. Résultat : la page
transposée annonçait `1=Ab` en tête et `1=A` au milieu — *deux tonalités sur la
même page, et celle du milieu fausse*, ce que l'itération 15 appelle le pire cas.

Le remède ne demande aucun code de rendu : c'est une **étiquette composite**.
Écrite `1= A` avec son espace, `transposeLabel` réécrit le seul jeton qui est
un accord et laisse `1=` verbatim (sans l'espace, `1=A` est un jeton unique et
ressort tel quel — la grammaire décide, pas l'intention).

**Le corps ne se déduit pas de la boîte, il se règle contre le voisin.**
Au corps de la portée (`fh` = hauteur de capitale, 33 px), « 1= Bb » est plus
large que « 1= A » et **efface la barre de mesure** qui suit : le plancher de
rétrécissement à 0,80× (itération 38) ne suffit pas quand le nom cible gagne une
lettre. `fh` ramené à 27, puis 24 sur l'autre page, et les deux barres restent
entières. Vu au `zoom-browser`, jamais sur la planche.

**`inline-key.py`.** Le geste de l'itération 35 — s'ancrer sur le glyphe « = »
plutôt que d'attendre qu'un découpage donne la bonne bande — rejoué sur la
**page entière**. Deux pièges, tous deux déjà connus de la boucle :

- `_hbars` ne balaie que les 380 premières colonnes (`EQ_MAX_X`), borne
  invisible depuis `equals` puisqu'elle vit dans un défaut d'argument. Un
  libellé à mille pixels de la marge disparaissait **avant tout test** ;
- le vote lettre/chiffre du voisin de droite, pris comme filtre, écartait
  justement le bon : le « G » de 旷野中唯一的力量 se lit « 0 » à +0,05 contre
  −0,01. C'est mot pour mot l'erreur des 22 cadres faux de l'itération 33 —
  **le vote s'imprime, il ne décide pas**.

Le seul discriminant gardé est que le voisin de **gauche** soit un « 1 », ce qui
écarte la ligne de tempo `♩=NN`. Il reste 44 candidates sur 36 pages, dont les
fausses sont des `♩=NN`, des hanzi à barres empilées (信, 福) et un « Johnson ».
Aucun seuil ne les sépare — mesuré : la corrélation du voisin droit vaut −0,10
pour un faux 信 et −0,11 pour le vrai cadre de 十架的爱. Quarante-quatre
vignettes se lisent en quatre planches, et **le corpus ne cachait aucun autre
cas** : c'est un résultat négatif, mais mesuré.

**L'étiquette écrite dans la mauvaise convention.** 永恒唯一的盼望 grave
`C#/F` — un do♯ sur un fa qui tient lieu de mi♯, le V6 de F#m, hors du
vocabulaire du `.cho` donc illisible par construction. Recopié **tel
qu'imprimé** dans `extra_labels`, il ressortait publié `C/E`. La page est gravée
en E sous un `.cho` en F, et `build-chords` applique le décalage à la frontière
(itération 34) : `gold/` est dans la convention du `.cho`, `chords.json` dans
celle de la page. Un accord recopié de la page est donc **faux d'un demi-ton**,
et faux de façon plausible — `C/E` est un accord parfaitement normal ici. Ni les
compteurs, ni le banc (qui le transposait correctement), ni la file ne pouvaient
le dire. Seule la planche, qui met le gravé au-dessus du rendu, l'a montré.

*C'est la deuxième fois que les deux conventions se croisent* — l'itération 34
avait trouvé 65 accords faux pour la même raison sur les deux pages où les clés
diffèrent. Le décalage a été vérifié avant écriture sur les six pages de cette
itération : `song_semitones` vaut 0 sur cinq d'entre elles, 11 sur celle-ci.

**Trois pages de plus, et une rangée soudée que le détecteur ne pouvait pas
voir.** 主的喜乐是我力量 était notée PRÊT à 18/25 : sa **première** rangée
d'accords (`Emaj7 Amaj7 Emaj7`, un 7 en exposant collé à un arc) n'était pas lue,
sa rangée de reprises non plus (`B7 | B7 | Emaj7` sous les crochets 1. et 2.,
soudés à l'amas) — et surtout une rangée **soudée de deux accords** (`B7`,
`A(add2)`) noyée dans une bande typée `numbers` de 103 px. `welded_rows` ne peut
rien pour elle : sa décision est une *part* d'amas appariés, et une rangée de
deux n'a pas de part. C'est la planche qui l'a montrée — deux accords sans cadre
au milieu d'une page convertie.

一切歌颂赞美 portait quatre **alternatives entre parenthèses** posées seules
au-dessus d'une rangée — `(G#m)`, `(D)` deux fois, `(E/B)` — chacune seule dans
sa bande, donc dans aucune rangée d'accords, donc dans aucun dénominateur. Plus
deux groupes `(E C#m F#m B7)` dont seule l'étiquette du milieu était appariée :
la parenthèse collée à la lettre suffit à sortir un jeton du vocabulaire.

Et 十架的爱 publiait `Em11` sur une boîte de 51 px là où le gravé en fait 69 : le
second « 1 » tombait hors du masque et serait resté imprimé à côté du nom réécrit.

**Bilan.** Certifiés **50 → 59 sur 127** (我们欢迎君王降临, 爱的彰显, 脚步,
永恒唯一的盼望, 我们的神, 旷野中唯一的力量, 主的喜乐是我力量, 一切歌颂赞美,
圣灵的江河), étiquettes 3462 → **3504**, calques 92 et cadres 1=X 87 inchangés.
La file passe de 12 à **3 prêts**, 0 rangée cachée ou soudée. Le balayage
navigateur passe de 80 à **79 pages sans défaut sur 92** : le `Bbmaj7` de
主的喜乐是我力量 est plus long que le `Amaj7` gravé et son fond opaque coupe
l'arc de liaison qui passe dessous — le compromis assumé de l'itération 38, vu au
zoom et accepté (les deux extrémités de l'arc restent lisibles). Les 237 tests
Playwright passent. `npx tsc --noEmit`, `npm run validate` et `npm run lint`
passent (49 avertissements préexistants, 0 erreur).

**Ce qui reste, nommé.**

- **`inline-key.py` ne lit que `p1`**, comme tout le reste de la chaîne. Les
  chants à deux pages (为我而来) n'ont de calque que sur la première ; ce n'est
  pas un défaut de ce script mais une limite du calque, et elle n'est écrite
  nulle part.
- Les **rangées de capo masquées** (我们的神, 旷野中唯一的力量 : trois chacune)
  laissent un rectangle vide là où la page grave des accords. C'est le choix de
  l'itération 28 et il tient, mais il n'a jamais été confronté à ce que
  l'utilisateur en pense : une position de capo effacée est une information
  perdue, pas seulement une tonalité étrangère écartée.
- Le trou nommé à l'itération 39 tient toujours : la **ligne d'intro de
  握住幸福** (`【前奏 | G D/F# | … | D】`) reste hors de portée du détecteur de
  rangée soudée, 3 amas appariés sur 10.
- **`welded_rows` ne voit pas une rangée soudée de deux accords** : sa décision
  est une part d'amas appariés, et 主的喜乐是我力量 en portait une (`B7`,
  `A(add2)`). Le seuil n'est pas en cause — une part n'a pas de sens sur un
  dénominateur de deux. Ce qui la trouverait est un test de *position* (une
  rangée d'accords se tient au-dessus de la rangée de chiffres, à une hauteur
  d'étiquette), pas un test de contenu.
- Les 3 pages « PRÊT » restantes — 十架的爱, 好喜欢与你在一起, 赞美之泉 — ont leur
  vérité terrain écrite et relue (amas parasites écartés, `Em11` élargi) mais pas
  encore leur planche complète. **好喜欢与你在一起 a un décalage de 2 demi-tons**
  entre son `.cho` et sa gravure : c'est la page sur laquelle il faut se souvenir
  de la convention. 赞美之泉 attend en plus son cadre « 1=X ».

### Itération 41 — la page qui n'écrit pas « 1= », et le cadre rendu 0,71× trop petit

**Les trois PRÊT de l'itération 40 sont certifiées**, chacune planche entière
au navigateur, thème sombre compris : 好喜欢与你在一起 (37 accords, C→C#, la
ligne composite « 先F后F#dim » et les deux crochets de reprise), 十架的爱
(45 accords, D→Eb, `Em11` sur sa boîte élargie) et 赞美之泉 (26 accords, D→Eb,
les `A⁷` à 7 en exposant). Aucun mode C, aucun mode D : le travail de vérité
terrain fait à l'itération 40 tenait.

**Une page peut annoncer sa tonalité sans écrire « 1= ».** 赞美之泉 grave
**« D 4/4 »** — la lettre seule, collée au chiffrage. `measure-keylabel`
s'ancre sur le glyphe « = » depuis l'itération 35 : il ne pouvait donc pas la
voir, et sa seule candidate sur cette page était un morceau de la ligne de
paroles 从天父而来的. 你们要赞美耶和华, hymnaire, l'écrit **à l'envers** :
**« F=1 »**, lettre d'abord — le détecteur trouve bien le « = » mais exige un
« 1 » à sa gauche (le garde posé à l'itération 40 pour écarter les `♩=NN`), et
sort « AUCUNE candidate ». Deux formes de plus, sur les cinq seules pages
publiées qui n'avaient pas de cadre ; les trois autres (一生跟随, 哦十字架,
十架的爱) écrivent bien « 1=F », et sur deux d'entre elles la candidate proposée
était la **ligne de tempo** ♩=80 / ♩=100, jamais le cadre.

Le corpus publié est donc entièrement couvert : **cadres 1=X 87 → 92 sur
92 calques**, tous relus à la boîte d'encre près.

**Le champ qui manquait depuis l'itération 35.** Le client écrivait
`1=<tonalité jouée>` dans le cadre, ce qui suppose que la lettre gravée est
celle des accords. Sur 十架的爱 elle ne l'est pas : la page grave « 1=F »
au-dessus d'accords en D — des **positions de capo 3**, dont F est le son réel.
Y écrire « 1=Eb » aurait décalé la lecture de toute la page de trois demi-tons,
et c'est pourquoi l'itération 35 avait écarté le cadre en notant, dans le
`gold`, qu'« il manque un champ distinct pour le do gravé ».

Ce champ est `key_label.c` : le **texte gravé**, écrit dans la convention du
`.cho` comme tout ce qui va dans `gold/`, et transposé par `transposeLabel`
exactement comme une étiquette — le décalage des accords s'applique au seul
jeton qui est un accord, le reste de la ligne reste verbatim. « 1= F » (avec
l'espace, sans quoi `1=F` est un jeton unique et ressort tel quel) donne
« 1= Gb » ; « D » donne « Eb » ; « F=1 » donne « Gb=1 » **sans espace ajouté**,
parce que la grammaire d'accord lit la fondamentale et garde « =1 » en suffixe.
Absent, le client écrit `1=<tonalité jouée>` comme avant : les 87 cadres
existants ne bougent pas.

*Le détour par `extra_labels` ne marchait pas, et c'est le client qui le dit* :
la mécanique composite de l'itération 40 rend bien le texte, mais `complete`
et le bandeau « seuls les accords en bleu ont été transposés » se lisent tous
deux sur `key_label`. Publié en étiquette, le cadre laissait 十架的爱 et
赞美之泉 marquées **PARTIEL alors qu'elles étaient complètes**, et faisait dire
au bandeau des trois pages partielles « les autres sont ceux d'origine, comme
l'indication « 1=F » en haut de page » — au-dessus d'un en-tête qui affichait
désormais « 1= Gb ». Une itération qui ajoute un mécanisme sans regarder ce qui
lit son absence déplace le défaut au lieu de le corriger.

**Le cadre était rendu 0,71× trop petit sur les 92 pages.** `h` est la hauteur
de **capitale** du libellé gravé ; le client la posait telle quelle en
`font-size`. C'est mot pour mot l'erreur que l'itération 38 avait corrigée pour
les accords (« le corps se mesure, il ne se devine pas ») et que le cadre
n'avait jamais reçue — parce qu'aucun contrôle ne le regardait : le balayage
géométrique ne ramasse que les `[data-jianpu-label]`, et le cadre n'en portait
pas ; la planche n'encadre en rouge que ces mêmes marqueurs, si bien qu'un
cadre juste s'y lisait comme un accord non converti. Marqueur
`data-jianpu-keylabel` ajouté, balayage et planche élargis, **le banc de
transposition gardant son périmètre** — il juge les étiquettes, pas l'appareil.

Divisé par la hauteur de capitale, le cadre atteint le corps gravé et
**recouvre le chiffrage « 4/4 »** sur 3 pages (何等恩典, 一生跟随, 哦十字架) :
352, 205 et 239 px d'encre effacés. Le rétrécissement `sp` des étiquettes
(itération 38) le ramène à une seule page — 何等恩典 — parce que son plancher
de 0,80× l'empêche de descendre assez bas. **Le cadre n'a donc pas de
plancher** : il est seul en haut de page et reste lisible rétréci, alors que la
fraction qu'il efface est une information perdue — c'est le défaut qu'on avait
dû réparer sur 齐来赞美 (itération 35). Mesuré au balayage : **encre couverte
inchangée à 16, pages sans défaut inchangées à 79 sur 92**, cadres compris,
alors que 91 d'entre eux gagnent 40 % de corps.

**Bilan.** Certifiés **59 → 62 sur 127** (好喜欢与你在一起, 十架的爱, 赞美之泉),
calques 92 et étiquettes 3504 inchangés — cette itération n'a lu aucun accord
de plus, elle a réparé l'appareil. Cadres « 1=X » **87 → 92**, dont 5 à texte
gravé. La file « PRÊT » est **vide**, 0 rangée cachée ou soudée sur les
30 pages restantes comme sur les 62 certifiées. Les 249 tests Playwright
passent, `npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **La file est vide sans que le corpus soit fini** : les 30 pages restantes
  ont toutes entre 9 et 71 amas à relire, et aucun outil ne les rend moins
  chères qu'un passage à l'œil sur planche de lot. C'est désormais le seul
  goulot, et il est linéaire.
- 爱赢了 tient à lui seul **71 amas** sur les ~470 restants, à 28 % de
  couverture : c'est la gravure serrée à accords longs du jeu de contrôle, et
  personne n'a encore regardé pourquoi le matcher y échoue si massivement.
- Le **plancher de rétrécissement des accords** (0,80×, itération 38) reste la
  cause des 16 « encre couverte » du balayage. Le cadre vient de montrer qu'un
  élément isolé peut s'en passer ; rien ne dit qu'un accord au milieu d'une
  rangée le puisse.
- Les trous nommés à l'itération 40 tiennent : `inline-key.py` ne lit que `p1`,
  les rangées de capo masquées laissent un rectangle vide, la ligne d'intro de
  握住幸福 reste hors de portée du détecteur de rangée soudée, et `welded_rows`
  ne voit pas une rangée soudée de deux accords.

### Itération 42 — « 71 amas à relire » dont 52 n'existaient pas, et la voie qui ignore les correctifs

**爱赢了, le goulot nommé à l'itération 41, n'était pas une page difficile.**
Elle affichait 28/99 — 28 %, le pire du corpus, 71 amas à relire. Les 71 se
décomposent ainsi, et aucun compteur ne le disait :

- **52 amas ne sont pas des accords.** Trois bandes typées `chords` par le
  classifieur sont deux rangées d'**arcs de liaison et de points d'octave**
  (17 et 11 amas) et une rangée de **chiffres** (24). Elles ne publient rien
  et pèsent les trois quarts du dénominateur. `not_rows` les retire.
- **10 amas sont des marques de navigation** — le signe de coda ⊕, le segno 𝄋,
  « D.S. », les coins de crochet de reprise ⌐1 / ⌐2, une barre de mesure. Cette
  gravure les imprime **sur la rangée d'accords elle-même**, à la hauteur des
  accords. C'est une famille de parasites que la boucle n'avait pas nommée :
  ceux de l'itération 25 étaient des arcs et des titres anglais, ceux-ci sont
  de la notation, et ils sont là où l'on cherche.
- **le reste était bien du travail**, et il tenait dans trois amas soudés.

**Le filet horizontal, un troisième mode de soudure.** Le trait du crochet de
reprise court d'un bout à l'autre du système, à trois pixels d'épaisseur.
`column_clusters` teste la **présence** d'encre colonne par colonne (`any`) :
le filet en met partout, donc « Asus4 A Asus4 A » ressort en **un seul amas de
993 px**. Rien ne peut le lire, et rien ne le signalait — ni `hidden_rows` (la
rangée est bien typée `chords`), ni `welded_rows` (la rangée est bien isolée).

Compter la **hauteur** d'encre de chaque colonne au lieu de sa présence sépare
le filet des lettres sans rien connaître de la gravure : les colonnes du filet
en font 3, celles des lettres 15 à 25. `_split_welded` (propose-extra) recoupe
donc un amas franchement trop large **si le filet est vraiment là** — la moitié
au moins de ses colonnes à l'épaisseur d'un trait — sans quoi une étiquette
composite serait coupée en morceaux. Sur 爱赢了 l'amas de 993 px se sépare en
sept : ⌐1, `Asus4`, `A`, ⌐2, `Asus4`, `A`, barre. **+11 propositions sur le
corpus**, dont 6 ici : c'est peu, et c'est le peu qui manquait.

**Une rangée coupée en deux devenait invisible à `--all`.** Le filtre des
rangées ouvertes testait `f["top"] in published`, une **égalité exacte** entre
le haut de la bande et le `y` d'une étiquette. Or le `y` d'une étiquette est le
haut de son encre : dès que le découpage recale (`_top_block`) ou coupe la
rangée en deux, l'égalité échoue et la rangée entière disparaît des
propositions, **avec les étiquettes déjà publiées dedans**. C'est mot pour mot
le doublon de l'itération 14, dont le test `(y, x)` exact avait été remplacé par
un recouvrement ; le même geste ici (+5 propositions, toutes sur cette page).

**La voie « vérité terrain » ignore `corrections`, `not_rows` et
`not_labels`.** C'est le vrai coupable, et il datait de l'itération 6 : une page
qui porte `chord_rows` publie **uniquement** ce que la transcription couvre, et
`_from_gold` saute en silence toute rangée absente ou dont le compte d'amas a
bougé. 爱赢了 avait 4 rangées transcrites sur 11 : elle publiait 15 étiquettes
et laissait **six rangées entières** dans la tonalité d'origine, sans qu'aucun
outil puisse y ajouter quoi que ce soit — les `corrections` écrites dans son
`gold` n'auraient rien fait.

L'inventaire du corpus donne **sept pages** à `chord_rows`. Six sont gelées, donc
la question ne se pose plus pour elles. La septième était 你们要赞美耶和华, avec
**une rangée transcrite sur quatre**. Les deux pages sont passées à la voie de
lecture, leur transcription conservée en clair dans `chord_rows_retire`.

**你们要赞美耶和华, la gravure hymnaire du jeu de contrôle, est faite.** C'est
la page dont le matcher **ne garde aucune lecture** : ses neuf scores vont de
−0,65 à +0,12, unanimes et tous sous le seuil, et deux sont faux — le « ♭B » à
bémol **exposant** lu `C`, le « F » sous sa liaison lu `Bb`. Elle est
entièrement en `corrections` et `extra_labels`. Trois défauts s'y ajoutaient :

- une **rangée d'accords soudée au système** (♭B C F F ♭B), rangée dans la
  bande `numbers` du deuxième système, que ni `hidden_rows` ni `welded_rows` ne
  voient ;
- la deuxième ligne de **paroles** promue `chords`, huit amas de hanzi dans le
  dénominateur ;
- et surtout : le classifieur donne à la rangée 806 une bande de **14 px** là où
  les lettres en font 37. Ses cinq amas sont des *fragments* — le « C » sort à
  6 px de large — et le fond opaque laissait dépasser le bas du gravé sous le
  nom réécrit. Un amas n'est pas toujours plus large que la lettre : il peut
  être **plus petit qu'elle**, et c'est un cas que la boucle n'avait pas vu.

**Bilan.** Certifiés **62 → 64 sur 127** (爱赢了, 你们要赞美耶和华), étiquettes
3504 → **3531**, calques 92 et cadres 92 inchangés. La file « PRÊT » reste vide,
0 rangée cachée ou soudée sur les 28 pages restantes comme sur les 64
certifiées. Balayage : **79 pages sans défaut sur 92**, inchangé — les quatre
nouvelles « encre couverte » sont les quatre « A » de 爱赢了 réécrits « Bb », qui
débordent de 10 px sur le filet du crochet, lisible de part et d'autre. Les
257 tests Playwright passent, `npx tsc --noEmit`, `npm run validate` (370 chants)
et `npm run lint` (49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **La couverture ne mesure toujours pas ce qu'on croit** : sur 爱赢了 elle
  comptait 99 amas dont 52 n'étaient pas des accords, et sur 你们要赞美耶和华
  18 dont 8 étaient des hanzi. Tant qu'une page n'a pas été relue rangée par
  rangée, son pourcentage ne dit rien — ni en bien (itération 29) ni en mal.
- **`welded_rows` reste aveugle à la rangée soudée au système** quand ses
  étiquettes partagent la bande avec les chiffres *sans* qu'aucune rangée
  d'accords propre existe à côté (你们要赞美耶和华, y≈468). Le test de
  *position* nommé à l'itération 40 reste à écrire.
- **Un amas peut être plus petit que sa lettre.** La bande de 14 px de la
  rangée 806 n'a été vue qu'au balayage, et seulement parce que le nom réécrit
  était plus large ; une bande trop courte sous un nom de même largeur ne
  déclenche rien. Un contrôle « la boîte fait-elle la hauteur du corps de la
  page ? » se mesurerait sans navigateur.
- Les 28 pages restantes ont de 9 à 28 amas à relire chacune, dénominateurs
  compris. Aucune n'est plus l'aberration que 爱赢了 semblait être.

### Itération 43 — un accord encadré n'est pas un accord converti

Quatre pages prises de bout en bout, choisies pour être les moins chères de la
file : 一粒麦子, 这里有神的同在, 我愿为你去, 求主充满我. Elles affichaient de 9 à
12 amas à relire ; ce que la relecture y a trouvé n'était pas ce que le compteur
annonçait, et le défaut qui comptait n'était dans aucun compteur.

**Le dénominateur ment toujours, et de la même façon.** Sur les 25 amas proposés
par `propose-extra --all --hidden`, **11 ne sont pas des accords** : le signe de
coda 𝄋, les titres de section gravés 【Chorus】 et 【Bridge】, et le « D.S. al
Fine » que le découpage coupe en deux — la famille nommée à l'itération 42 sur
爱赢了, que ces gravures posent elles aussi **sur la rangée d'accords**. S'y
ajoutent **cinq rangées entières** typées `chords` qui n'en sont pas : trois
rangées de **chiffres** (一粒麦子 y=298, 这里有神的同在 y=518, 求主充满我 y=1372),
la rangée des **crochets de reprise** ⌐1 / ⌐2 de 我愿为你去 (y=1500), et le bloc
de **titre** de 求主充满我 (y=236, « Come and Fill Me Up » et la référence
biblique). `not_rows` les retire ; les quatre pages passent alors à 47/47, 30/30,
36/38 et 23/29 — les écarts restants sont des amas publiés par `extra_labels`,
que la voie de lecture continue de compter manquants.

**Un mode C que l'audit voit et que rien d'autre ne voit.** 我愿为你去 publiait
`D/F#` là où la page grave `D7/F#` (1763,1471) : accord du vocabulaire, unanime,
retenu à +0,36. Il n'apparaît nulle part comme un défaut — il compte pour une
réussite dans la couverture, il passe le banc (il *est* transposé), et le
balayage n'y voit rien de géométrique.

**Le troisième mode de soudure, retrouvé ailleurs.** Le filet du crochet de
reprise de 我愿为你去 réunit « ⌐1 D ⌐2 D » en un amas de 783 px, exactement comme
les 993 px de 爱赢了. `_split_welded` (itération 42) le sépare ; les deux `D`
sont publiés en `extra_labels`, l'amas entier écarté en `not_labels`.

**Le défaut de l'itération : `[Gm]`.** 一粒麦子 grave un accord de remplacement
entre crochets, `[Gm]`, à côté d'un `Gm代替Bb]`. Le second se transposait, le
premier non : `transposeLabel` découpe sur `LABEL_SPLIT`, et une étiquette **sans
séparateur** repassait droit par `transposeChord`, sans jamais voir les crochets
de bord que `transposeRun` sait peler. `transposeChord` ne sait pas lire `[Gm]`,
donc il le rendait verbatim — en fa, au milieu d'une rangée en fa dièse.

Ce qui compte n'est pas la correction, qui tient en cinq lignes, mais que **rien
ne le signalait** :

- les compteurs le comptent réussi — l'étiquette *est* publiée ;
- l'audit l'**encadre en rouge**, puisque le cadre dit « le calque publie ici »
  et non « le texte a changé » ; c'est l'œil, et lui seul, qui a lu `[Gm]` sous
  le cadre ;
- le balayage ne voit rien : l'étiquette ne déborde de rien ;
- le banc Playwright mécanise pourtant **cet oracle exact** — « aucune étiquette
  ne reste identique » — mais il ne tourne que sur les pages **certifiées**,
  c'est-à-dire jamais sur celles où le défaut vit encore. 一粒麦子 y entre
  aujourd'hui ; hier, elle n'y était pas.

La correction est miroir dans `src/lib/transpose.ts` et
`scripts/jianpu/overlay.py`, et ne pèle qu'en **second recours** : à un décalage
non nul, un accord que `transposeChord` a su lire change toujours de nom, donc un
texte rendu inchangé vaut échec de lecture. Le garde de l'itération 34 — « les
milliers d'étiquettes déjà publiées gardent exactement le rendu qu'elles
avaient » — tient donc par construction, et se mesure : sur **442 332 rendus**
(toutes les étiquettes publiées, aux onze décalages et aux douze tonalités),
**132 changent, et toutes sont la même étiquette**, `[Gm]`.

**Bilan.** Certifiés **64 → 68 sur 127**, étiquettes 3531 → **3545**, calques 92
et cadres 92 inchangés. La file « PRÊT » reste vide, 0 rangée cachée ou soudée
sur les 24 pages restantes. Balayage : **77 pages sans défaut sur 92**, contre
79 — les deux nouvelles sont un `A7` → `Bb7` et un `D` → `Eb` dont le fond
déborde sur leur **propre** gravé et sur un filet de crochet ; le zoom navigateur
montre que rien d'imprimé n'est perdu, c'est la famille du plancher de
rétrécissement (0,80×, itération 38). Les **273 tests Playwright** passent,
`npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **Le cadre rouge de l'audit dit « publié », pas « converti ».** C'est le seul
  contrôle qui voie le mode D, et il ne distingue pas une étiquette réécrite
  d'une étiquette rendue verbatim. Encadrer d'une autre couleur ce qui n'a pas
  changé de texte se mesurerait dans le navigateur, et rendrait `[Gm]` visible
  sans avoir à lire.
- **Le banc ne protège que le déjà certifié.** Son oracle — « aucune étiquette
  ne reste identique » — vaut pour n'importe quel calque publié ; le passer sur
  les 24 pages restantes, en avertissement plutôt qu'en échec, coûterait une
  boucle et rendrait cette famille de défauts mécanique.
- Les 24 pages restantes ont de 9 à 28 amas à relire chacune, dénominateurs
  compris. Le goulot reste linéaire, et il reste l'œil.

### Itération 44 — les trois angles morts du contrôle

L'itération 43 finissait sur deux trous nommés : le banc ne protège que le déjà
certifié, et le cadre rouge de l'audit dit « publié », pas « converti ». Le
premier se bouche en une ligne ; le boucher a fait tomber les deux autres.

**Le banc passe des 68 certifiées aux 92 calques.** « Aucune étiquette publiée
ne reste identique » est une assertion légitime sur un calque **partiel** : ce
qui le rend partiel, ce sont les accords sans étiquette, pas les étiquettes non
réécrites. `partialSlugs()` et un second bloc de tests le disent aux 24 pages en
cours — **309 tests**, tous verts. Le corpus n'en cachait aucun autre : rejoué
hors navigateur sur les 3 545 étiquettes aux onze décalages et douze tonalités,
**zéro** reste verbatim. `[Gm]` était bien le seul.

**Le cadre « 1=X » n'était pas dans le test de chevauchement.** Il y est entré à
l'itération 41 — mais seulement dans celui de l'**encre couverte**, qui a sa
propre requête DOM. Le test de chevauchement, lui, lit ses boîtes par
`overlayLabels`, et ce helper ne demande que `[data-jianpu-label]`. Un accord
publié *sous* le cadre n'était donc vu de nulle part. Il y en avait un :
和散那 publiait un `F` à x=76, dans le cadre « 1=F » qui va de x=10 à x=113 —
c'est le « F » de « 1=F », promu accord parce que la rangée d'en-tête entière
(chiffrage 4/4, annotation, signature) est typée `chords`. Transposée, la page
peignait « 1=F# » et « Gb » l'un sur l'autre. `overlayLabels(page, 0,
{ avecCadre: true })` le rend visible, et `not_rows` le retire.

**Un accord peut tomber entre deux bandes.** Le premier système de 和散那 ne
porte qu'un accord, un « F » de 13 px sur 24. Trop peu d'encre pour que le
découpage lui fasse une bande : il tombe dans un vide de 90 px, entre l'en-tête
et les chiffres. `hidden_rows` teste une bande mal typée, `welded_rows` fouille
une bande trop haute ; **les deux supposent qu'une bande existe**. La page
affichait « 35/35, 100 % » sans lui, et l'audit navigateur seul l'a montré.

`orphan_rows` regarde donc les vides eux-mêmes : tout intervalle plus haut
qu'une rangée d'accords, découpé en amas, filtré sur la taille d'une étiquette,
puis **passé au matcher**. Sur les 92 calques, 94 amas passent la géométrie et
**aucun** ne s'apparie, à quelque score que ce soit — les vides d'une page sont
pleins de barres de mesure, de crédits, de filigrane. Le « F » de 和散那, lui,
sortait à +0,28. Le corpus n'en cache pas d'autre.

**La hampe du bémol exposant, sur une page certifiée.** Certaines gravures
écrivent « B♭ » avec le bémol en petit, au-dessus et à droite de la lettre. Sa
hampe monte plus haut que la capitale, donc plus haut que la bande de rangée
d'où sort la boîte. Le nom réécrit couvre les lettres et **laisse la hampe** :
sur 圣灵的江河, certifiée, un trait vertical de treize pixels survivait au-dessus
de chaque `B/Db` — c'est-à-dire le bémol qu'il est, et la page affichait
`B♭/Db`.

C'est le contrôle « la boîte fait-elle la hauteur du gravé ? » laissé ouvert à
l'itération 42. Il se mesure sans navigateur, et il sépare deux familles sans
seuil délicat : la hampe est **fine** (au pire 0,09 de la largeur de
l'étiquette), le filigrane de 到各山岭去传扬 et les arcs sont **larges** (au mieux
0,27). `haut_grave` remonte donc la boîte sur une trace fine et contiguë à
l'encre de l'étiquette, sans toucher au bas, où le texte s'aligne. **43
étiquettes sur 11 pages**, dont six certifiées.

**Quatre pages prises de bout en bout** : 和散那, 如果你想知道, 我要全心赞美,
荣耀的呼召. Deux d'entre elles sont de la famille à bémol exposant, et n'auraient
pas pu être certifiées avant `haut_grave`. Sur 如果你想知道, l'audit a montré une
**rangée d'alternatives** gravée *au-dessus* de l'autre — la version pour
enfants entre parenthèses, que la page annonce en toutes lettres (« 后面所有上层()
里的和弦也是该版本 »). Le classifieur la range en `chords?`, le matcher n'en garde
rien, elle n'entre dans aucun dénominateur : la page affichait « 45/45, 100 % »
en laissant `(D)` et `(G/B)` en sol au milieu d'un système en la bémol.

**Élargir le vocabulaire coûte, encore.** 如果你想知道 grave un `G/B` absent de
son `.cho`. L'ajouter en `extra_chords` l'a rendu lisible — et a fait **tomber
trois `G/D`** que le matcher publiait très bien : il les lit désormais `G/B`,
entre +0,08 et +0,18, sous le seuil. C'est l'itération 9 rejouée à l'échelle
d'une page ; les trois sont épinglés en `corrections`.

**Bilan.** Certifiés **68 → 72 sur 127**, étiquettes 3545 → **3571**, calques 92
et cadres 92 inchangés. La file « PRÊT » reste vide, 0 rangée cachée, soudée ou
orpheline sur les 20 pages restantes comme sur les 72 certifiées. Balayage :
**75 pages sans défaut sur 92** — deux de moins qu'avant, et les deux sont le
cadre qui entre enfin dans le test : le masque qui efface le ♭ exposant de
我们成为一家人 le touche par construction, et les alternatives de 如果你想知道
sont posées juste au-dessus de la rangée qu'elles doublent. Les **309 tests
Playwright** passent, `npx tsc --noEmit`, `npm run validate` (370 chants) et
`npm run lint` (49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **Le cadre rouge dit toujours « publié », pas « converti ».** L'oracle est
  mécanisé sur les 92 calques, mais la planche, elle, ne distingue toujours pas
  à l'œil une étiquette réécrite d'une étiquette rendue verbatim. Deux couleurs
  suffiraient.
- **Trois détecteurs pour une même famille.** `hidden_rows`, `welded_rows` et
  `orphan_rows` cherchent tous le mode D, chacun sous une hypothèse différente
  sur ce que le découpage a fait. La quatrième forme — la **rangée
  d'alternatives** typée `chords?` que le matcher écarte en entier — n'a
  toujours pas de détecteur, et c'est celle qui a coûté le plus cher cette
  itération.
- **Le dénominateur ment encore, toujours dans le même sens** : sur les quatre
  pages, cinq rangées entières typées `chords` n'étaient pas des rangées
  d'accords (chiffres, crochets de reprise, blocs de titre), et onze amas sur
  trente-huit étaient des marques de navigation.
- Les 20 pages restantes ont de 12 à 28 amas à relire chacune.

### Itération 45 — la rangée que l'œil avait sous les yeux

L'itération 44 finissait sur un constat : quatre formes de mode D, trois
détecteurs, et la quatrième — la **rangée d'alternatives** — trouvée à l'œil.
Il a suffi d'un jour pour que ce trou coûte une certification.

**如果你想知道 en portait deux, et je n'en ai vu qu'une.** La page double ses
accords : la version pour enfants entre parenthèses, gravée *au-dessus* de
l'autre, ce qu'elle annonce en toutes lettres. L'audit de l'itération 44 en a
montré une (système y=1069, tranche 4) ; la seconde (système y=731) était sur
la **tranche 3**, lue le même jour, et l'œil est passé dessus. La page a été
certifiée avec, et a publié une journée en deux tonalités.

Ce n'est pas un accident d'attention : c'est ce que le protocole prévoit sans le
dire. Les tranches se recouvrent, on lit deux fois la même image, et la seconde
fois on la reconnaît au lieu de la lire. **Un contrôle qui repose sur l'œil seul
n'a pas de plancher.**

**Le plancher de `hidden_rows` était à trois amas.** Une rangée d'alternatives
n'en porte souvent que deux. Descendre à deux sans rien d'autre rend le test
bavard — huit rangées de plus sur le corpus, **toutes à 1/2, toutes fausses**
(bruit, fragments, arcs). Exiger que les **deux** amas s'apparient les écarte
toutes et garde la vraie : sur les 92 calques, la règle du tout ou rien sort
exactement une rangée, celle qui manquait. La même règle va dans `welded_rows`,
qui partage ces gardes et venait de gagner deux faux positifs au passage.

**Et `hidden_rows` ne tournait pas sur les pages certifiées.** La passe
`--certifiées`, ajoutée à l'itération 39, n'appelait que `welded_rows` puis
`orphan_rows`. La chasse la plus ancienne des trois était donc la seule à ne
jamais relire ce qui était déclaré fini — c'est-à-dire exactement là où une
rangée manquée fait le plus de dégâts, puisque plus personne ne regarde. Les
trois chasses regardent maintenant les deux moitiés du corpus, et la seule page
qu'elles nomment est celle-là.

**Le cadre orange.** Le trou nommé depuis l'itération 43 — « le cadre rouge dit
publié, pas converti » — se bouche en quatre lignes : au moment de poser les
cadres, l'audit compare le texte rendu au texte gravé et marque en **orange
3 px** ce qui n'a pas changé. À un demi-ton, aucun nom d'accord ne se conserve ;
l'orange ne peut donc signifier qu'une chose. Le corpus n'en produit aucun — le
marqueur a été prouvé sur une étiquette forcée, qui ressort bien à 3 px orange
quand ses voisines restent à 1 px rouge.

**Quatre pages prises de bout en bout** : 一生跟随, 叫我抬起头的神, 哦十字架,
这里有荣耀. Trois d'entre elles gravent leurs altérations **en exposant**, et
c'est là que le matcher échoue le plus lourdement : sur 叫我抬起头的神, **neuf
des quatorze amas relus étaient lus faux** — `E/G#` pour `B/D#`, `E/B` pour
`E/G#`, `E/G#` pour `F#m7`. Aucun n'était publié (tous sous le seuil), mais rien
n'aurait empêché la publication s'ils l'avaient franchi : le vocabulaire fermé
contient les quatre. 一生跟随 ajoute une variante que la boucle n'avait pas
rencontrée : le bémol **antéposé**, « ♭B », lu `C7` par le matcher aux quatre
occurrences.

**Bilan.** Certifiés **72 → 76 sur 127**, étiquettes 3571 → **3605**, calques 92
et cadres 92 inchangés. La file « PRÊT » est vide, et 0 rangée cachée, soudée ou
orpheline sur les 16 pages restantes **comme sur les 76 certifiées**. Balayage :
75 pages sans défaut sur 92, inchangé. Les **321 tests Playwright** passent,
`npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **La planche d'audit se lit deux fois et se voit une fois.** Les tranches se
  recouvrent pour ne rien couper ; le prix est qu'on relit une image déjà vue.
  Marquer les tranches déjà couvertes, ou n'en rendre que les systèmes,
  supprimerait la seconde lecture — c'est là qu'une rangée s'est perdue.
- **Le dénominateur, encore** : sur ces quatre pages, sept rangées entières
  typées `chords` n'étaient pas des rangées d'accords (chiffres sous ligature,
  seconde voix, crochets de reprise).
- **Le matcher et les altérations en exposant** : trois des quatre pages en
  portent, et c'est le seul motif où il se trompe plus souvent qu'il ne réussit.
  Un gabarit qui place le dièse en exposant n'a jamais été essayé.
- Les 16 pages restantes ont de 14 à 28 amas à relire chacune.

### Itération 46 — la vérité terrain servait à contourner le matcher, pas à le mesurer

L'itération 45 finissait sur un défaut nommé : « le matcher et les altérations
en exposant — c'est le seul motif où il se trompe plus souvent qu'il ne réussit.
Un gabarit qui place le dièse en exposant n'a jamais été essayé. » Le corriger a
demandé de construire d'abord ce qui manquait pour le mesurer.

**Deux jeux étiquetés dormaient dans `gold/`.** Les `corrections` — 236 amas sur
29 chants, chacun relu au zoom — ont été écrites pour *contourner* le matcher ;
les `frozen_labels` — 3002 étiquettes sur 76 pages, chacune vue sur une planche
d'audit — pour geler ce qui est publié. Ni l'un ni l'autre n'avait jamais servi
à **mesurer la lecture**, alors que c'est le seul moyen de faire d'un réglage de
gabarit autre chose qu'un pari : jusqu'ici on changeait un gabarit et on
regardait une planche, ce qui dit si *cette* page va mieux et rien des cent
autres. `bench-match.py` les rejoue tous les deux en huit secondes.

**Et le premier essai du gabarit surélevé aurait été accepté sans lui.** Dessiné
avec la géométrie du chiffrage — 0,62 de corps, 0,38 de hauteur, les valeurs qui
gravent le « 7 » de « D⁷ » — il gagnait 20 amas et en perdait 13, dont cinq d'un
coup sur 主的喜乐是我力量. Balayé sur les 2311 étiquettes de vérité terrain, ce
couple est **le plus mauvais coin de la grille** (+4 sur 25 essais) : le corpus
veut une altération à peu près de la taille de la lettre, seulement remontée
(+22). Le maximum brut est ailleurs — 0,24 / 0,88, +26 — mais ses voisins
tombent à +14, donc c'est du bruit et on ne le suit pas ; on prend le point dont
tout le voisinage tient, et qui a en plus un sens de gravure.

**La médiane des scores, elle, désignait exactement le mauvais réglage.** Sur
主的喜乐是我力量, le gabarit surélevé fait monter la médiane de +0,02 à +0,13
pendant que l'exactitude tombe de 17/18 à 11/18. Choisir la gravure page par
page sur le score aurait donc choisi le contraire de la vérité. *Un gabarit plus
expressif s'ajuste mieux à tout, y compris à ce qu'il ne devrait pas lire.*
Réglé, il n'y a plus rien à choisir : 28 amas gagnés contre 5 perdus, et le
réglage global capte presque tout ce qu'un choix par page donnerait.

**Le mode C n'avait aucun recours, et personne ne s'en était aperçu** parce que
le contournement existait. `corrections` était lu *après* `keep()` : il ne
pouvait que combler un trou, jamais contredire une lecture retenue. Sur
十字架的传达者, cinq `Gmaj7` et `Dmaj7` publiaient `F#m7` à +0,42 et unanimes,
et écrire la correction n'y changeait rien. Le raisonnement d'origine était de
provenance — ne pas mélanger ce qui a été vu avec ce qui a été deviné — mais une
correction *est* le verdict de l'œil au zoom, et une lecture retenue un score de
gabarit. Renversé, cela ne change rien au corpus du jour : **zéro** correction
n'y contredisait de lecture retenue, personne n'en ayant jamais écrit d'inerte.

**La page qui portait les trois défauts à la fois.** 十字架的传达者 n'avait pas
de calque ; le gabarit surélevé lui a fait passer le plancher de 60 %, et elle
s'est mise à publier — avec cinq faux accords, une rangée entière jamais isolée
(mode D, huit accords), un segno soudé à `Gmaj7`, un `D.S.al.Coda ⊕` soudé à
`Bm`, une bande d'arcs de liaison comptée comme rangée, et un cadre « 1= » que
`measure-keylabel` ne voit pas parce qu'il propose la ligne de tempo ♩=65 à la
place. Le progrès d'un outil sort des pages de sous le plancher : **il faut
regarder celles qui entrent, pas seulement celles qui montent.**

**Ce que l'œil a cru et que la mesure a démenti.** Cette même page est gravée
dans une serif franche, et son `face` déclaré est `din-bold`, une linéale. Sur
les 36 étiquettes relues, les trois serif du catalogue lisent 24/36 et
`din-bold` 30/36. Le `face` n'a pas bougé : l'apparence n'est pas une mesure.

**Deux pages prises de bout en bout**, 我的家要荣耀主 (dièses en exposant, plus
un amas soudé « Bm Bm/A G » rouvert en trois étiquettes) et 十字架的传达者.
Certifiés **76 → 78 sur 127**, calques 92 → **93**, étiquettes 3605 → **3676**,
cadres 1=X 92 → **93** (tous les calques en portent un).

**Une rangée cachée sur une page certifiée**, la première depuis que la chasse
y passe (itération 45) : deux **points d'octave** de 8 × 7 px sur 尽情的敬拜,
que la règle du tout ou rien à deux amas laissait passer et qui seraient restés
signalés indéfiniment sur une page que plus personne ne regarde. Une bande de
7 px ne peut pas porter d'étiquette — la plus petite jamais certifiée en fait 13
sur 3118 —, donc le plancher se pose sous la plus petite vraie.

Les **328 tests Playwright** passent, `npx tsc --noEmit`, `npm run validate`
(370 chants) et `npm run lint` (49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **La planche d'audit se lit deux fois et se voit une fois** — inchangé depuis
  l'itération 45, et vérifié encore : sur les deux pages du jour, les tranches
  6 et 7 rendent les mêmes deux rangées.
- **`measure-keylabel` propose la ligne de tempo et rien d'autre** quand elle
  est plus contrastée que le « 1= ». Il n'ordonne pas ses candidates par
  vraisemblance, et sur 十字架的传达者 il n'en a proposé qu'une, la mauvaise.
- **Le mode C reste sans détecteur.** Le banc le mesure sur les pages déjà
  relues ; sur une page neuve, seul l'audit navigateur le voit, et rien ne dit
  où regarder.
- **Le dénominateur, encore** : trois amas de cette page n'étaient pas des
  étiquettes (arc de liaison, signe de coda, mention *D.S. al Coda*), et une
  bande entière n'était que des arcs.
- Les 15 pages restantes ont de 14 à 28 amas à relire chacune.

### Itération 47 — trois signaux d'incertitude, et le mode C n'en est pas un

L'itération 46 laissait le mode C sans détecteur : « le banc le mesure sur les
pages déjà relues ; sur une page neuve, seul l'audit navigateur le voit, et rien
ne dit où regarder ». Chercher ce détecteur a d'abord demandé de réparer
l'instrument.

**Le banc mesurait dans la mauvaise convention sur un quart du corpus.** Les
`corrections` nomment les accords comme le `.cho` ; les `frozen_labels` comme la
**page**, parce que `freeze.py` recopie ce que le calque publiait et que le
client part de `printedKey`. Sur les 32 pages gravées hors de la tonalité de leur
`.cho`, le banc comparait donc `F` gravé à `Eb` lu et comptait chaque accord
juste comme une faute. C'est exactement le piège de l'itération 34 — dont le
commentaire de `build-chords` nomme la victime, 好喜欢与你在一起 — reparu dans
l'outil construit pour le mesurer. **Quarante des soixante-trois « lectures
retenues et fausses » n'étaient que ce décalage.** Le banc compare maintenant des
**hauteurs**, pas des chaînes, ce qui règle du même coup l'enharmonie (`Eb` contre
`D#`) et écarte les étiquettes composites, qu'aucune lecture d'un amas unique ne
peut égaler.

Le mode C réel n'était donc pas de 3,2 % mais de **0,4 %** : huit accords sur
1955 lectures retenues.

**Les trois signaux d'incertitude échouent tous, et pour la même raison.**

| signal | ce qu'il attrape | ce qu'il coûte |
|---|---|---|
| score | 1 des 8 | 5 % des lectures justes |
| marge au deuxième accord | 2 des 8 | 193 justes à relire |
| désaccord des 7 fontes (`dissent.py`) | 3 des 8 | 514 justes à relire |

Six des huit fausses ont une **marge supérieure** à la médiane des justes, et
trois sont **unanimes sur les sept fontes**. Le matcher n'hésite pas : il est
sûr, et il a tort. `dissent.py`, construit à l'itération 24 pour cette chasse
précise, n'avait jamais été mesuré contre un jeu étiqueté — il l'avait été sur
sa **précision** (« 29 contestées → 8 faux accords ») et jamais sur son rappel.

La raison est structurelle : *un jury de variantes d'un même modèle ne peut pas
voir l'erreur du modèle.* Les sept fontes partagent l'hypothèse que l'étiquette
est l'une des chaînes du vocabulaire, dessinée dans une fonte système. Quand
cette hypothèse casse, elles cassent ensemble. La boucle le savait à moitié
(itération 19 : « juger une page grasse avec trois maigres… l'unanimité dirait
« sûr » sur une faute partagée ») mais l'appliquait à la famille de fonte, pas au
modèle lui-même.

**Ce n'était pas une erreur de lecture : le matcher lisait des mots amputés.**
La question « pourquoi si sûr ? » a mené là où aucun signal d'incertitude ne
pouvait mener. La bande d'une rangée est taillée sur sa **masse** d'encre, donc
sur le corps des lettres ; ce qui dépasse se fait trancher. Sur 十字架的传达者,
`Gmaj7` et `Dmaj7` arrivaient au matcher **sans la queue de leur « j »** — boîte
de 33 px au lieu de 37 — et un `Gmaj7` sans jambage a `F#m7` pour plus proche
voisin, à +0,42 et unanime. **Cinq des huit seuls accords faux du corpus
venaient de là.**

Le découpage suit maintenant l'encre au-delà de la bande. Contre la vérité
terrain : amas durs **197 → 234**, publiables **37 → 76**, gelés relus 2252 →
2312, mode C **8 → 3** (0,15 %), dont un qui n'est qu'un artefact de mesure.

**Et le raisonnement sur le sens du débordement était faux.** « Ce qui distingue
un accord, c'est le chiffrage surélevé, donc c'est en haut que la bande coupe » :
par le haut seul, la vérité terrain ne bouge pas (205/261, mode C toujours à 8) ;
il faut les deux sens, et c'est le **bas** qui apporte tout. Sans le balayage on
aurait livré la moitié qui ne sert à rien, avec une bonne explication.

Tout ce qui dépasse n'est pas bon à prendre — la **barre oblique** de « C/G »
monte plus haut que les lettres sur 全新的你, et la reprendre fait tomber sept
étiquettes. Mais le plancher qui l'écarterait coûte plus qu'il ne rapporte
(durs 225 → 211, mode C 3 → 8). On ne garde donc du plancher que ce qui est
gratuit : rejeter la ligne d'un ou deux pixels isolés.

**Le plancher de publication ne savait rien des rangées cachées.** Une rangée
que le découpage n'isole pas ne publie rien mais **ne coûte rien au
dénominateur** : la page franchit les 60 % sans elle et sort en deux tonalités.
Deux fois de suite un progrès du matcher a poussé au-dessus du plancher une page
qui les portait — 十字架的传达者 à l'itération 46, 奔跑不放弃 ici. `worklist.py`
le mesurait déjà, mais il n'est qu'un tableau de bord, lu après coup : deux fois
trop tard. La garde est passée dans `build-chords`, qui **retient** la page et
dit pourquoi.

**Bilan.** Certifiés **78 → 79 sur 127** (爱可以再更多一点点, dont deux accords
hors `.cho` — `Gmaj7/A`, `A7(♭9)` — et un `D/F♯` traversé d'une barre sur 128 px).
Calques 93 → **91** : 奔跑不放弃 retenue par la garde, 在这里 et 我已得自由
retombées sous le plancher — leurs accords à barre oblique restent **lus juste**,
mais la boîte grandie de 2 px leur coûte assez de score pour passer sous le
seuil. Étiquettes 3676 → 3590, cadres 91. Les **329 tests Playwright** passent,
`npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur) aussi. Balayage géométrique :
62 pages sans défaut sur 78.

**Ce qui reste, nommé.**

- **La pénalité de chasse punit ce qu'elle devrait absorber.** Une gravure dont
  la barre oblique dépasse donne des boîtes plus hautes que les gabarits, et
  `width_factor` — une médiane de page — ne la rattrape pas puisque seuls les
  accords à barre bougent. Deux pages y ont perdu leur calque.
- **Le mode C n'a toujours pas de détecteur**, et l'itération montre qu'il n'y en
  aura pas du côté de l'incertitude. La piste est du côté du **modèle** : ce qui
  a marché ici, c'est d'avoir demandé *pourquoi* le matcher était sûr, pas *à
  quel point*.
- **Les jumeaux visuels ne se contredisent pas** : essayé, 0 des 8 attrapées.
  Deux gravures du même mot sur la même page corrèlent 0,96 entre elles ; une
  amputée et une entière, 0,55. Le test dit donc la coupe, pas la lecture — c'est
  ce qui a mis le jambage sur la piste, mais ce n'est pas un détecteur.
- **La planche d'audit se lit deux fois et se voit une fois** — inchangé depuis
  l'itération 45.
- Les 13 pages restantes ont de 11 à 24 amas à relire, plus 奔跑不放弃 et ses
  3 rangées cachées, désormais retenue au lieu de publier faux.

### Itération 48 — deux réglages rejetés, et 38 % du travail restant qui n'existait pas

L'itération 47 laissait une dette nommée : sa correction du découpage avait fait
retomber deux pages sous le plancher, **avec des lectures pourtant justes** —
la boîte grandie de 2 px coûtait assez de chasse pour passer sous le seuil.

**Deux façons de rendre la chasse moins sévère, mesurées et rejetées.**

La première : mesurer la chasse sur le **corps** de l'étiquette — les lignes
vraiment chargées — au lieu de la boîte entière, pour qu'un jambage ou une barre
oblique qui dépasse ne compte pas. Balayée de 0,05 à 0,40, elle fait monter les
publiables (76 → 104) et **descendre l'exactitude** (234 → 213 amas durs). Elle
ne ramène ni l'une ni l'autre des deux pages, à aucun réglage.

La seconde : proposer **les deux coupes** au gabarit — la bande et la bande
débordée — et garder la meilleure, ce qui est la doctrine de la boucle partout
ailleurs (« on propose les deux, c'est l'image qui tranche »). Elle gagne sur les
pages gelées (2317 → 2325) et perd sur les amas durs (234 → 228), avec **un mode
C de plus**.

Les deux échouent pour la même raison, et c'est le résultat de l'itération 47
retourné : chacune **augmente la confiance**, et la confiance n'est pas ce qui
était cassé. Prendre le maximum sur deux coupes, c'est précisément le mécanisme
du mode C — laisser gagner la lecture la plus sûre d'elle-même.

**Les pages sous le plancher n'avaient aucun outil.** `propose-extra`, la planche
d'audit et `dissent` lisent tous `chords.json` ; une page sous les 60 % n'y est
pas. Les 36 pages qui ont le plus besoin d'yeux étaient donc exactement celles
que l'outillage refusait — « chant sans calque », et rien pour y entrer. C'est
la troisième fois que la boucle bute sur la même forme (itérations 33, 37) :
*une mesure ne voit pas le travail qui reste, et l'outil qui la sert non plus.*
`build-chords` sait maintenant construire un calque **provisoire**, sans le
plancher ni la garde de mode D — deux règles de *publication*, pas de *travail*.

**Et 38 % de la file « à relire » n'étaient pas des accords.** Une barre de
mesure fait 2 px de large sur 10 de haut, et il y en a une par mesure ;
`suspects()` les comptait toutes. Sur les 91 calques : **319 amas → 199**. Les
douze plus gros écartés ont été rendus et regardés — douze arcs de liaison, pas
un accord. La plus petite étiquette réelle jamais certifiée fait 9 × 13 sur
3 174, le plancher se pose à 5 × 11.

La file « PRÊT », vide depuis deux itérations, en sort avec **cinq pages** — pas
parce que du travail a été fait, mais parce que le compteur a cessé de compter
des barres de mesure. C'est mot pour mot l'itération 33, et c'est la deuxième
fois que la file paraît vide pour une raison qui n'a rien à voir avec les pages.

**Bilan.** Certifiés **79 → 80 sur 127** (差遣我, dont les douze derniers amas
étaient tous lus juste et rejetés par le seuil : que des accords à basse). Calques
91, étiquettes 3602, cadres 91. Les **332 tests Playwright** passent,
`npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur) aussi.

**Ce qui reste, nommé.**

- **La dette de l'itération 47 n'est pas payée** : 在这里 et 我已得自由 restent
  sous le plancher. Deux réglages mesurés n'y font rien ; il faudra les
  travailler à l'œil, ce que le calque provisoire permet enfin.
- **« PRÊT » ne veut toujours pas dire propre** (itération 29) : le verdict
  tombe dès qu'il reste moins de 9 amas, et quatre des cinq pages n'ont pas été
  auditées.
- **在这里 est un cas à part** : elle porte un 【升G调】 (changement de ton) sur
  sa dernière rangée, un `Em` gravé hors de son `.cho`, et deux rangées déjà
  masquées en capo. À traiter avec la question des pages à deux tonalités, pas
  comme une page ordinaire.
- **La planche d'audit se lit deux fois et se voit une fois** — inchangé depuis
  l'itération 45.

### Itération 49 — la file vidée, et l'alternative que rien ne propose

L'itération 48 laissait cinq pages « PRÊT » dont quatre n'avaient jamais été
auditées, et six autres au-dessus du plancher. Onze pages, donc, avec un calque
publié et pas de certification. Elles y sont toutes passées.

**Une passe au lieu de deux.** Le coût d'une page n'est pas le calcul, c'est le
nombre d'allers-retours vers l'œil : sept tranches d'audit à regarder, et
autant à re-regarder après correction. Les quatre premières pages ont été
faites à l'ancienne — audit, correction, ré-audit — et les sept suivantes en
une seule passe : `propose-extra --all --hidden` sur le lot entier (118 amas,
six planches de zooms), écriture de tous les `extra_labels`, **puis** l'audit.
Le ré-audit ne sert qu'à revoir ce qu'on vient d'écrire ; il reste nécessaire
quand l'audit trouve quelque chose, et sur les sept pages il n'a porté que sur
les trois qui avaient un défaut, et seulement sur leurs tranches concernées.

**L'alternative parenthésée seule au-dessus de sa rangée n'a aucun outil.**
坐在宝座上圣洁羔羊 en porte quatre : « (Gm7) » deux fois, « (G/B  ) » deux fois,
gravées seules dans une bande à elles, au-dessus de la rangée d'accords qu'elles
commentent. Aucun outil ne les propose :

- le classifieur ne type pas la bande `chords` — elle ne précède pas des chiffres ;
- `hidden_rows` exige **deux** amas appariés (itération 45, la règle du tout ou
  rien qui écartait huit faux positifs) et la bande n'en porte qu'**un** ;
- `welded_rows` cherche une bande *trop haute* pour sa rangée, pas une bande
  qui ne contient qu'une étiquette ;
- `propose-extra --all` ne rend que les rangées où le calque publie déjà.

Elles ne se voient donc que sur la planche d'audit, et c'est là qu'elles ont été
prises. C'est la même forme que la rangée d'alternatives de 如果你想知道
(itérations 44 et 45), mais réduite à une seule étiquette, ce qui la fait passer
sous le dernier garde qui la voyait.

**Un accord peut être cité dans une phrase.** 神羔羊配得 écrit, en marge du
dernier système, « （还有两个空小节 D7 G） » — *il reste deux mesures vides, D7
puis G*. Ce sont deux accords vrais, gravés au corps du texte courant et non à
celui de la page ; réécrits au `labelH` ils déborderaient sur la portée. `fh`,
le corps propre à une étiquette (itération 37), leur rend leur taille. Le
critère est celui de la boucle et pas celui du typographe : **un accord écrit
sur la page est un accord de la page**, et le laisser en sol au milieu d'une
page en la bémol, c'est la page à deux tonalités.

**Un amas peut être plus petit que le plancher.** Le premier « F » de 你是配的
sort du découpage sur **4 px de large** et celui de 坐在宝座上圣洁羔羊 sur
**3** — la hampe seule, la barre du F perdue. Le plancher de l'itération 48
(5 × 11, posé sous la plus petite étiquette réelle connue, 9 × 13) les écarte
tous les deux, à raison : ce ne sont pas des étiquettes, ce sont des morceaux
d'étiquette. Ce que le plancher ne dit pas, c'est qu'il reste un accord derrière.
Les deux ont été mesurés à la main sur les pixels, et les deux étaient les
**premiers accords de leur page**.

**Et un mode D entier.** 这一生最美的祝福 laissait sa rangée d'intro complète —
« Gmaj7 · D/A · Gmaj7 », gravée dans une police à empattements au-dessus de la
première ligne de chiffres — jamais isolée par le découpage, donc absente de
tous les dénominateurs. La page était notée « PRÊT ». C'est la démonstration,
une fois de plus, que **« PRÊT » ne veut pas dire propre** (itérations 29 et 48) :
le verdict tombe quand il reste moins de neuf amas *connus*.

**Ce que le matcher lit faux, quand il lit.** Les 118 amas relus l'ont été
contre le gravé, jamais contre la lecture proposée, et l'écart se concentre sur
les basses d'une gravure à empattements : sur 最美的礼物, quatre « F/G » lus
« F/C », deux « Dm/G » lus « Dm/C », deux « Fm/G » lus « Em/B », un « A7 » lu
« Am ». Sur 为我而来, trois « Em7 » lus « Fm7 » et un « Fsus4 » lu « Fmaj7 ».
Sur 你是配的, trois « Bb/C » lus « Bb/F ». Ces amas-là ne sont pas publiés — le
matcher les refuse au seuil — mais ils disent où le gabarit est faible : **la
lettre de basse, après la barre oblique**.

**Bilan.** Certifiés **80 → 91 sur 127**. Les 91 calques publiés sont désormais
**tous certifiés et tous complets** ; la file « PRÊT » est vide et le reste,
faute de candidat : toute page non certifiée est maintenant une page **sans
calque**. Étiquettes 3602 → **3712**, cadres 91. Les **365 tests Playwright** passent
(332 à l'itération 48 : l'oracle de transposition couvre les mêmes 91 calques,
mais onze pages y gagnent le test « calque complet, donc pas de bandeau »),
ainsi que `npx tsc --noEmit`, `npm run validate` (370 chants) et `npm run lint`
(49 avertissements préexistants, 0 erreur).

**Ce qui reste, nommé.**

- **36 pages sans calque**, sous le plancher de 60 %. C'est tout ce qui reste, et
  le calque provisoire de l'itération 48 est la seule porte d'entrée. La boucle
  change de régime : elle ne certifie plus des pages presque finies, elle ouvre
  des pages que le matcher n'a pas su lire.
- **La dette de l'itération 47 n'est pas payée** : 在这里 et 我已得自由 restent
  sous le plancher, avec des lectures pourtant justes.
- **在这里 est un cas à part** (itération 48) : 【升G调】 sur sa dernière rangée,
  un `Em` hors de son `.cho`, deux rangées de capo déjà masquées.
- **L'alternative parenthésée solitaire n'est toujours pas outillée.** Un
  détecteur possible : une bande d'une seule étiquette, de la hauteur d'une
  rangée d'accords, posée juste au-dessus d'une rangée `chords`, dont le contenu
  commence par « ( ». Rien ne l'a mesuré.
- **La planche d'audit se lit deux fois et se voit une fois** — inchangé depuis
  l'itération 45.

### Itération 50 — quatre façons de publier plus, toutes payées en mode C

L'itération 49 laissait la file vide et un régime neuf : *ouvrir des pages que
le matcher n'a pas su lire*. 40 pages sans calque, 2 283 amas, **835 retenus
(37 %)** — contre 95 % sur les pages certifiées. Avant d'en relire mille à
l'œil, il fallait savoir *où* se perd la différence. Le relevé la partage en
trois : **229 amas** rejetés par le jury seul, **713** par le seuil seul,
**506** par les deux.

**Le seuil, mesuré pour la première fois sur le corpus qu'il gouverne.**
`MIN_SCORE = 0,28` est calé depuis l'itération 5 contre **un** amas parasite du
jeu de contrôle, et son commentaire le dit — « un corpus plus large le fera sans
doute bouger ». Le corpus porte aujourd'hui de quoi le juger : 3 093 étiquettes
lues à l'œil (`frozen_labels` + `corrections`) comme positifs, et **159
`not_labels`** comme négatifs — le seul jeu qui mesure ce que le seuil défend,
et qui n'avait jamais servi. L'exactitude des lectures unanimes est plate de
0,40 à 0,20 (97-100 %) puis **s'effondre à 29 % dans [0,18 ; 0,20[**. La falaise
est donc réelle et le seuil est un peu haut — mais descendre à 0,20 ne rend que
**+45 amas sur les 40 pages, et n'en ouvre qu'une**. Le seuil n'est pas le
goulot : les 713 amas « unanimes sous le seuil » ne sont pas des quasi-succès,
ils sont très en dessous.

**Le vocabulaire ouvert, deuxième hypothèse rejetée.** Rejouer les 40 pages
contre l'alphabet du corpus gagne 54 amas et en perd 277 (835 → 612). C'est
l'itération 9 reconfirmée à l'échelle du corpus.

**La fonte, troisième — et c'est la mesure qui compte.** Les 40 pages portent
toutes une fonte élue par `sweep-key`, sur le nombre d'amas *au seuil*, **sans
le jury**, et aucune n'a jamais été regardée. Rejouer les 95 pages certifiées
sous les sept fontes départage trois électeurs, à tonalité fixée :

| électeur | publiables | publiés justes | **publiés FAUX** |
|---|---|---|---|
| la fonte de `gold/` (l'œil) | 2 600 | 2 527 | **3** |
| la mieux au seuil (`sweep-key`) | 2 697 | 2 606 | **13** |
| la plus publiable (`keep`) | 2 715 | 2 626 | **11** |

Les deux automates gagnent une centaine d'amas et **quadruplent le mode C**.
La fonte que l'œil retient lit moins, et lit juste. Ce n'est donc pas l'électeur
qu'il faut changer, c'est l'œil qu'il faut faire passer — et rien ne le
permettait. D'où `face-plate.py` : une colonne par amas, une ligne par fonte,
l'amas **gravé** en haut et dessous le gabarit **qui a gagné**, rendu dans cette
fonte-là. On ne lit pas les scores, on regarde les formes.

Sur 祷告, une fois les tofus corrigés, la planche est sans appel : la page est
gravée en **serif**, et ce sont `times`, `times-bold` et `georgia` qui ont son
dessin — alors qu'elles publient 12, 8 et 8 amas quand `helvetica-bold` en
publie 34. **La fonte qui ressemble à la page n'est pas celle qui publie le
plus.** C'est exactement pourquoi le vote automatique se trompe, et pourquoi la
planche montre la forme au-dessus du chiffre.

**Le jury, quatrième.** Sur 祷告, 44 amas passent le seuil et 23 seulement sont
publiés : 22 rejets, dont **treize où Verdana seule diverge** (« E/G# » lu
« B/D# », « E » lu « B »). Un juré systématiquement faux sur une gravure met son
veto à la page entière, alors que la doctrine écrite est l'accord, pas
l'unanimité. Mesuré sur les certifiés : unanimité 2 608 publiables / **4 faux** ;
majorité 2/3, 2 787 / **12** ; un seul juré, 2 904 / **29**. Rejeté.

Les quatre échouent pour la même raison, et c'est l'itération 48 confirmée à
quatre reprises : **chacune achète de la couverture avec du mode C**, à peu près
un accord faux pour quinze gagnés. L'invariant « aucun accord faux publié depuis
l'itération 6 » ne se troque pas.

**Ce que la planche a montré, et qui n'était pas la fonte.** Sur la planche de
祷告, cinq fontes sur sept écrivent « E/G□ », « F□m », « B/D□ » : le **tofu**,
le rectangle `.notdef` que FreeType rend quand le glyphe manque. Vérification :
sur les sept fontes de `FACES` et les six du jury, **une seule dessine le bémol
musical** (U+266D) et quatre le dièse. Or `spellings()` propose « ♭B » et
« B♭ » depuis l'itération 5, écrites exprès pour les recueils chinois qui
antéposent le bémol. **Ces gabarits-là n'ont jamais été autre chose que des
rectangles**, ni en référence ni au jury — et l'inégalité de couverture entre
une fonte et ses jurés fabriquait des désaccords sur des lectures justes.

Le premier réflexe — écarter la gravure que la fonte ne sait pas écrire — est
juste et sans effet (835 → 836). Le bon geste est l'autre : **un vrai graveur
compose ses lettres dans sa fonte de texte et va chercher le bémol dans une
fonte qui en a un.** `_render` découpe donc chaque texte en suites de
caractères que la même fonte dessine (`_runs`), avec un recours par famille
(`FALLBACK` : Arial Unicode pour les linéales et les grasses, STIXGeneral pour
les serif). Les sept fontes écrivent maintenant un vrai bémol surélevé.

Au banc : **246 → 248 durs**, **76 → 85 publiables**, **2 926/3 070 → 2 932/3 073
gelés**, aucune colonne en baisse. `--tous` nomme 8 amas gagnés et 6 perdus, tous
de la même famille — les basses à altération après la barre oblique. Sur les 40
pages l'effet est un lavage (+3), mais deux pages passent le plancher.

**Deux pages ouvertes, certifiées, et ce que chacune a appris.**

- **祷告** (51 % → 45/45). Sur les 17 amas relus au zoom, **5 étaient mal lus**
  par le matcher (« Bsus4 » proposé « B/D# », deux « C#m » et deux « G#m »
  proposés « F#m ») : la proposition ne se croit pas. Surtout, la planche
  d'audit a montré **trois « G#m » publiés « F#m »** — un mode C que le repli
  d'altération venait d'ouvrir, en faisant passer le jury à trois amas qui
  étaient rejetés la veille. Un réglage qui améliore trois compteurs peut créer
  un accord faux, et seul l'audit le voit.
- **若有人在基督里** (55 % → 48 étiquettes). Sa dernière rangée était un **mode D
  entier** : typée `chords` par le classifieur, mais dont aucun amas ne passait
  `keep()`, donc absente du calque — et **invisible à `propose-extra` dans ses
  deux modes**, puisque `--all` ne garde que les rangées où le calque publie
  déjà et que `--hidden` ne cherche que les cachées et les soudées. C'est une
  **quatrième façon pour une rangée de disparaître**, après cachée, soudée,
  orpheline : *détectée, mais muette*. Rien ne la cherche encore.

**Et un défaut que la planche n'a pas trahi.** Sur cette même page, un « Asus4 »
était publié sur le **haut d'un arc de liaison**, boîte de 16 px. Je l'ai vu sur
la planche d'audit et je l'ai lu comme l'accord de la rangée gravée : la planche
montre le gravé et le rendu l'un sous l'autre, mais rien n'oblige l'œil à
vérifier qu'un cadre du bas correspond à de l'encre en haut. C'est le **test de
débordement Playwright** qui l'a pris — « Bbsus4 » sortait de 20 px hors de la
page. La règle « la planche se lit deux fois et se voit une fois » a donc un
corollaire : *l'oracle mécanique attrape ce que l'œil, lui, croit avoir vu.*
Un amas dont la largeur est très inférieure au nom qu'on lui donne est
suspect — 16 px pour « Asus4 », soit 3,2 px par caractère, unique dans le corpus.

**Une page retenue à l'étude.** 在这里 n'était tenue hors du calque que par
accident : une rangée cachée déclenchait le mode D, et le réglage du matcher a
levé l'accident. Elle empile deux jeux d'accords par système (capo en ré
au-dessus des accords réels en fa) et module en 【升G调】 ; elle passait le
plancher et aurait publié une page à deux tonalités. Aucune des trois gardes —
plancher, mode D, certification — ne sait dire « l'œil a compris que cette page
ne doit pas paraître ». D'où `en_chantier` dans `gold/`, lu tout en haut de
`build()`.

**Bilan.** Corpus **135**, calques **95 → 97**, certifiés **95 → 97**, étiquettes
**3 987**, cadres 97. **Les 97 calques publiés sont tous certifiés et tous
complets** : aucune page PARTIEL ne paraît. Les **389 tests Playwright** passent
(384 avant correction du débordement), ainsi que `npx tsc --noEmit`,
`npm run validate` (370 chants) et `npm run lint` (49 avertissements
préexistants, 0 erreur). Banc du matcher regelé à 260/303 durs · 85 publiables ·
3 006/3 155 gelés.

**Ce qui reste, nommé.**

- **38 pages sans calque**, dont 在这里 retenue à l'étude. Le relevé par amas
  (`diag`) et la planche des 40 premières colonnes montrent qu'elles n'ont pas
  *un* problème mais au moins quatre : gravures à exposants que le gabarit rend
  mal, rangées soudées aux arcs de liaison (一切都更新 : 2/96), rangées jamais
  isolées où le classifieur découpe les **paroles** (伯利恒的喜讯 : 0/37), et
  au moins une page **manuscrite** (从心合一 : 3/65) qu'aucune fonte ne lira
  jamais — celle-là ne peut passer que par la transcription complète.
- **La rangée détectée mais muette n'a pas d'outil.** `propose-extra --all`
  devrait aussi rendre les rangées typées `chords` dont le calque ne publie
  **rien** ; c'est une ligne à changer et elle n'a pas été mesurée.
- **`face-plate.py` n'a servi qu'à deux pages.** Les 38 restantes portent une
  fonte que personne n'a regardée, et la mesure ci-dessus dit ce que cela coûte.
- **L'alternative parenthésée solitaire n'est toujours pas outillée**
  (itération 49) — mais elle s'écrit bien : « (C) » de 若有人在基督里 se pose en
  `extra_label` comme un accord ordinaire.
- **La planche d'audit se lit deux fois et se voit une fois** — inchangé depuis
  l'itération 45, et cette itération en donne le pire exemple.
