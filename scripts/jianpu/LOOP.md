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
   python3 scripts/jianpu/audit-page.py <slug>
   ```
   Tranches de 300 px qui se recouvrent, original au-dessus, rendu fidèle
   transposé dessous, cadres de contrôle activés. C'est le seul contrôle
   qui voie le mode **D — rangée entièrement manquée**, que ni la planche,
   ni les compteurs, ni `compare-render` n'attrapent, parce qu'une rangée
   jamais détectée n'apparaît dans aucun dénominateur. Sur une page
   transposée elle reste écrite dans l'ancienne tonalité, à côté d'accords
   transposés : la page mélange deux tonalités, ce qui est **pire que de
   n'avoir aucun calque**. **Un accord sans cadre n'est pas converti.**

   Ce qu'il reste à lire dans les rangées déjà connues se sort à côté avec
   `propose-extra.py <slug> --all`, pré-filtre par score levé.
6. Lire les planches, nommer les inconnues, ajuster les paramètres.
7. Écrire les seuils dans `classifier.json`, les paramètres de lecture dans
   `match.py`, et mettre à jour le journal ci-dessous.

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
