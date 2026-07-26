# Boucle — reconnaissance des accords 简谱

État persistant de la boucle d'ajustement. **Ce fichier est l'artefact
principal** : il porte le protocole, les métriques et le journal. Les deux
autres artefacts sont `classifier.json` (paramètres de classification des
rangées) et `templates/` (bitmaps d'étiquettes d'accords).

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

## Une itération

1. Lancer le pipeline sur le jeu de contrôle (puis sur les 124).
2. Calculer les métriques ci-dessous.
3. **Contrôle visuel — obligatoire, jamais sautable :**
   ```bash
   python3 scripts/jianpu/debug-render.py
   ```
   Puis **regarder `debug/_planche.png`**, qui tient les deux modes
   d'erreur :
   - **A — déclarées accords.** Toute rangée qui n'en est pas est un faux
     positif : des accords seraient redessinés au mauvais endroit.
   - **B — candidates ratées.** Toute rangée `?` juste au-dessus des
     chiffres. Les vraies rangées d'accords qui s'y trouvent sont les
     manques du classifieur.
4. Lire la planche, nommer les inconnues, ajuster les paramètres.
5. Écrire les nouveaux templates dans `templates/`, les seuils dans
   `classifier.json`, et mettre à jour le journal ci-dessous.

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
| 你们要赞美耶和华 | **sans accords imprimés** | — | à établir |

`你是配得` retiré du jeu : le slug réel est `你是配的` (coquille dans le
`{title:}` du `.cho`). À corriger séparément, hors de cette boucle.

Le dernier est un cas limite volontaire : le classifieur ne doit inventer
aucune rangée d'accords là où il n'y en a pas.

## Métriques

| Itération | Rangées d'accords trouvées (jeu de contrôle) | Étiquettes appariées | Chants résolus /124 |
|---|---|---|---|
| 0 (départ) | 0 / 7 chants | — | 0 |
| 1 | **4 / 7 chants** (gravure aérée uniquement) | pas de matcher | 0 |
| 2 | **6 / 6 chants** avec accords · A=29 dont 1 faux positif · B=8 ratées | pas de matcher | 0 |

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
