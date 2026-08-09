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

   C'est le seul contrôle qui voie le mode **D — rangée entièrement
   manquée**, que ni la planche ni les compteurs n'attrapent, parce qu'une
   rangée jamais détectée n'apparaît dans aucun dénominateur. Sur une page
   transposée elle reste écrite dans l'ancienne tonalité, à côté d'accords
   transposés : la page mélange deux tonalités, ce qui est **pire que de
   n'avoir aucun calque**.
5. Lire les planches, nommer les inconnues, ajuster les paramètres.
6. Écrire les seuils dans `classifier.json`, les paramètres de lecture dans
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
