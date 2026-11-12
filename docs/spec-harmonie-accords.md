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
