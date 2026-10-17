# 15. Le Nashville Number System et la transposition

| Id | Partie | Niveau | Statut |
| --- | --- | --- | --- |
| le-nashville-number-system-et-la-transposition | 3 | 2 | validée |

Le Nashville Number System écrit les accords avec des chiffres au lieu de lettres. Une seule grille sert alors dans toutes les tonalités : quand le leader change de tonalité, personne ne réécrit rien.

## 15.1 Le principe

Chaque accord prend le numéro de son degré dans la tonalité. En Do : C = 1, Dm = 2m, Em = 3m, F = 4, G = 5, Am = 6m, B° = 7°. En Sol, la même grille « 1 – 5 – 6m – 4 » donne G – D – Em – C.

## 15.2 Les symboles

| Symbole | Signification | En Do |
| --- | --- | --- |
| 1, 4, 5 | Accord majeur sur ce degré | C, F, G |
| 2m ou 2- | Accord mineur | Dm |
| 7° | Accord diminué | B° |
| 7ø | Demi-diminué | Bm7(b5) |
| b7, b6, b3 | Accord majeur sur un degré abaissé | Bb, Ab, Eb |
| 1/3 | Accord 1 avec le 3e degré à la basse | C/E |
| 4/5 | Accord 4 avec le 5e degré à la basse | F/G |
| 4maj7, 5(7), 2m7 | Accords enrichis | Fmaj7, G7, Dm7 |
| 1² ou 1(2) | Seconde ajoutée | Cadd9 ou Csus2 selon l'équipe |
| 5sus | Quarte suspendue | Gsus4 |
| ◆ | Jouer une fois, laisser sonner | — |
| ^ | Anticiper d'une croche (push) | — |
| Chiffres soulignés ou entre crochets | Plusieurs accords dans une même mesure | [1 4] = C puis F, 2 temps chacun |
| 1 / / / | Un accord par mesure, 4 temps | — |

## 15.3 Exemple de grille

Voici une grille inventée, telle qu'on l'écrirait pour une répétition. En Nashville, elle ne change jamais ; seule la ligne « Tonalité » change.

```
Tonalité : Do        Tempo : 72       4/4

Intro      1  |  4  |  6m  |  5
Couplet    1  |  5/7  |  6m  |  4
           1  |  5/7  |  4  |  5sus 5
Refrain    4  |  1/3  |  5  |  6m
           4  |  1/3  |  5  |  1
Fin        4  |  4m  |  1 ◆
```

| Section | En Do | En Sol | En Ré |
| --- | --- | --- | --- |
| Intro | C F Am G | G C Em D | D G Bm A |
| Refrain (1re ligne) | F C/E G Am | C G/B D Em | G D/F# A Bm |
| Fin | F Fm C | C Cm G | G Gm D |

## 15.4 Transposer à vue

1. Traduis chaque accord en chiffre dans la tonalité de départ : en Sol, D/F# = 5/7.
2. Traduis chaque chiffre dans la tonalité d'arrivée : en La, 5/7 = E/G#.
3. Garde la qualité et les extensions telles quelles : 2m7 reste mineur 7.
4. Pour les notes de basse, compte l'écart en demi-tons et applique-le à la basse aussi.

L'annexe 24 donne tous les accords dans les 12 tonalités pour vérifier.

## 15.5 Les transpositions les plus fréquentes

| Situation | Écart habituel | Exemple |
| --- | --- | --- |
| Chant écrit pour un leader homme, chanté par une femme | Une quarte ou une quinte | Si (B) → Mi (E) ou Fa# (F#) |
| Chant trop haut pour l'assemblée | Un ton à une tierce plus bas | Si (B) → La (A) ou Sol (G) |
| Dernier refrain plus lumineux | Un demi-ton ou un ton plus haut | Sol → Lab ou La |
| Deux chants à enchaîner | Vers la tonalité du second | Ré → Mi |

## 15.6 Le capo pour les guitaristes

Le capo remonte toutes les cordes d'un demi-ton par case. On joue des formes simples (Do, Ré, Mi, Sol, La) qui sonnent dans une autre tonalité.

| Tonalité souhaitée | Options de capo (case : formes jouées) |
| --- | --- |
| Do (C) | Sans capo : Do ; capo 3 : La ; capo 5 : Sol |
| Réb (Db) | Capo 1 : Do ; capo 4 : La ; capo 6 : Sol |
| Ré (D) | Sans capo : Ré ; capo 2 : Do ; capo 5 : La |
| Mib (Eb) | Capo 1 : Ré ; capo 3 : Do ; capo 6 : La |
| Mi (E) | Sans capo : Mi ; capo 2 : Ré ; capo 4 : Do |
| Fa (F) | Capo 1 : Mi ; capo 3 : Ré ; capo 5 : Do |
| Fa# (F#) | Capo 2 : Mi ; capo 4 : Ré ; capo 6 : Do |
| Sol (G) | Sans capo : Sol ; capo 3 : Mi ; capo 5 : Ré |
| Lab (Ab) | Capo 1 : Sol ; capo 4 : Mi ; capo 6 : Ré |
| La (A) | Sans capo : La ; capo 2 : Sol ; capo 5 : Mi |
| Sib (Bb) | Capo 1 : La ; capo 3 : Sol ; capo 6 : Mi |
| Si (B) | Capo 2 : La ; capo 4 : Sol ; capo 7 : Mi |

**Communication dans l'équipe :** le guitariste annonce toujours la tonalité réelle (« on est en Lab »), jamais seulement les formes jouées (« je joue en Sol capo 1 »). Sinon, le clavier et la basse joueront dans la mauvaise tonalité.

## 15.7 Nashville, jianpu et chiffres romains

Ces trois systèmes reposent sur la même idée : le degré dans la tonalité.

| Degré | Chiffres romains | Nashville | Jianpu (mélodie) |
| --- | --- | --- | --- |
| Tonique | I | 1 | 1 |
| 2e degré mineur | ii | 2m | 2 |
| 3e degré mineur | iii | 3m | 3 |
| Sous-dominante | IV | 4 | 4 |
| Dominante | V | 5 | 5 |
| Relatif mineur | vi | 6m | 6 |
| Sensible | vii° | 7° | 7 |

Un chanteur qui lit le jianpu lit donc déjà presque une grille Nashville. C'est un pont précieux dans une équipe bilingue.

## 15.8 Exercices

1. Écris en Nashville la grille de trois chants du répertoire.
2. Joue la grille de la section 15.3 en Do, Sol, Ré, La et Mi sans rien écrire.
3. Guitaristes : joue le même chant en Lab avec deux capos différents, et choisissez en équipe celui qui sonne le mieux avec le clavier.
