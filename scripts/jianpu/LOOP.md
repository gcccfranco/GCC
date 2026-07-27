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
classifieur et la bibliothèque de templates. Ils persistent sur le disque et
grossissent à chaque tour. L'oracle est mécanique, donc le progrès est
mesurable sans appréciation.

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
4. Lire la planche, nommer les inconnues, ajuster les paramètres.
5. Écrire les seuils dans `classifier.json`, les paramètres de lecture dans
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

8 chants couvrant les deux familles de gravure rencontrées :

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
