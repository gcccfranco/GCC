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

## Lots (chacun attend son go)

| Lot | Contenu | Ampleur | Dépend de |
| --- | --- | --- | --- |
| **H1** | /accords : clavier fixe (`Diagrammes.tsx` `ClavierMains`, `PanneauAccord.tsx:241`), variantes « Les plus joués » au-dessus du diagramme au téléphone, « ‹ Chants » montré seulement si l'on vient d'un chant (`PageAccords.tsx:48`, `:67`) | retouche, 3 fichiers | rien |
| **H2** | Données : `scripts/build-harmonie.ts` sort les boucles de quatre degrés les plus fréquentes (rotations fondues), leur compteur et leurs chants (section, tonalité), et le rattachement fiche → degré de la boucle ; afficher seulement les boucles mesurées | tranche | rien |
| **H3** | Catalogue en boucles : six chiffres, liste des boucles, page d'une boucle (idées par chiffre, chants en liens), « Toutes les idées » en familles ; ambiances dans une feuille ; deux volets jusqu'à 1 440 px, fiche ≥ 640 px | 2 tranches | H2 |
| **H4** | Fiche : « Avant → après » en chiffres et en lettres, « Où l'entendre » en liens, « Et ensuite ? » (notes communes, texte), pied précédente / suivante, retour par l'historique | tranche | H2 |
| **H5** | Chiffres sur la page chant et en mode louange (bascule, mémoire par musicien) | tranche | planche pupitre (AO en ligne) pour la place de la bascule en mode louange |
| **H6** | Idées en mode louange (point en marge, bande) | tranche | H2, état AO |
| **H7** | Écoute (Web Audio) | tranche, optionnelle | H4 |
| **H8** | Fiches manquantes (liste ci-dessous), statut « à valider » | contenu | H2 pour les fiches de boucles |

Avant chaque lot : vérifier ses constats d'usage (musiciens-2, 5, 7, 8, 10, 11, 12) sur la tête de branche. Libellés
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
