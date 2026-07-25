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
3. Produire une planche-contact de ce qui coince :
   - rangées dont la classification est incertaine ;
   - étiquettes d'accords non appariées.
4. Lire la planche, nommer les inconnues, ajuster les paramètres.
5. Écrire les nouveaux templates dans `templates/`, les seuils dans
   `classifier.json`, et mettre à jour le journal ci-dessous.

## Critère d'arrêt

≥ 95 % des 124 partitions résolues, **ou** deux itérations consécutives sans
progression de la couverture.

## Jeu de contrôle

8 chants couvrant les deux familles de gravure rencontrées :

| Chant | Gravure | Accords | Statut vérité terrain |
|---|---|---|---|
| 何等恩典 | aérée | courts (C, G, G/B) | à établir |
| 齐来赞美 | aérée | courts | à établir |
| 主的喜乐是我力量 | aérée | moyens | à établir |
| 我心坚定与你 | aérée, **2 rangées d'accords** | courts | à établir |
| 爱赢了 | serrée | longs (Dmaj9, Esus4) | à établir |
| 你是配得 | serrée | longs | à établir |
| 献上尊荣 | serrée | moyens | à établir |
| 你们要赞美耶和华 | **sans accords imprimés** | — | à établir |

Le dernier est un cas limite volontaire : le classifieur ne doit inventer
aucune rangée d'accords là où il n'y en a pas.

## Métriques

| Itération | Rangées classées | Étiquettes appariées | Chants résolus /124 |
|---|---|---|---|
| 0 (départ) | — | — | 0 |

## Journal

### Itération 0 — mise en place
Découpage en rangées opérationnel sur les deux gravures
(`segment.py`, découpage adaptatif). Classification non résolue : la
signature des amas dépend de la longueur des noms d'accords et ne se
transpose pas (何等恩典 largeur médiane 29–50 ; 爱赢了 88–90). Pas encore
de vérité terrain, pas encore de matcher.
