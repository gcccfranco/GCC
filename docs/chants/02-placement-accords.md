# Placement des accords : règles, mesure, seuils

Référence consultée depuis le runbook `00-nouveau-chant.md`. La règle est
simple ; ce qui rend le placement fiable, c'est qu'il est **mesuré** par
`scripts/cho/check.py` et jamais estimé à l'œil.

## La règle

`[X]` s'écrit **exactement là où la partition le met** : devant le
caractère au-dessus duquel le label commence, au caractère près. Décision de
Timothée du 26/09/2026 : ce que le document montre fait foi, même à
l'intérieur d'un mot, même si une autre coupe paraîtrait plus musicale.

```
Tou[G]tes les géné[C]rations     labels au-dessus de « t » et de « r »
mo[A]i · soleil[A]. · T'aim[A]er   labels au-dessus de « i », « . », « e »
温柔又慈[A7]祥                     label au-dessus de 祥
```

- Chinois : un caractère par syllabe, l'accord devant le caractère sous le
  label (ou sous la note du label, sur un scan 简谱).
- Français, PDF rendu depuis un ChordPro (église, shir.fr) : le caractère
  tapé sous lequel le label commence. Il n'y a pas de « même syllabe » :
  `pou[A]ssière` et `[A]poussière` sont deux placements différents, seul
  celui de la partition est juste.
- Français, image (scan, photo) : la lettre la plus proche du label, avec la
  réserve de fidélité de la source (voir plus bas).
- Un mot gravé coupé par un tiret du transcripteur (`sa - lut`) s'écrit
  entier, l'accord devant le même caractère : `sa[F]lut`. Ce n'est pas un
  doute.

## Les sept positions

Quand la partition porte le rythme (scan 简谱, export Finale), le label est
sur une note ; la position dans le texte se déduit ainsi :

| Ce que la partition montre | Ce qu'on écrit | Exemple |
|---|---|---|
| L'accord et la syllabe attaquent ensemble | collé : `[X]syllabe` | `你[C#m7]的爱` |
| L'accord sonne **avant** l'attaque de la voix (temps fort instrumental, silence de levée, note liée sans syllabe) ; sur un rendu ChordPro, label sur l'espace avant le mot | crochet puis espace : `[X] syllabe` | `喔主，[C] 你赐我` · `[D] 我们的神` · `[Bm] Tu m'appelles` |
| L'accord change **pendant** une syllabe tenue | juste après la syllabe, avant la ponctuation | `皿[C]，` · `什么[C/E]，` |
| L'accord sonne après la dernière syllabe **finie** (silence, ronde liée sans texte) ; sur un rendu ChordPro, label sur ou après la ponctuation | après la ponctuation, collé | `哈利路亚。[A/B]` · `poussière,[E]` |
| **Syncope liée** : la syllabe est attaquée une croche ou une double avant le temps où l'accord est gravé | après la syllabe qui anticipe | `崇[Gm]高` · `必反得生[Csus4]命[C]！` |
| Levée qui ouvre la section suivante, **avec** un accord gravé | au début de cette section, avec son accord | `{start_of_chorus…}` puis `[Bb/C] 献上我[F]生命` |
| Levée ou début de ligne **sans** accord gravé (l'accord précédent continue) | aucun accord : rien n'est inventé | `我不[D]害怕` |

- Deux occurrences de la même phrase peuvent être gravées différemment
  (pré-refrain `你爱[A]里`, refrain `里[A]`) : chaque occurrence se mesure.
- Un accord optionnel ou une alternative se transcrit toujours
  (`[(C/E)]`, `[G (G/B)]`, voir `01-format-cho.md`).
- Sur un rendu ChordPro, la position est celle de la frappe du transcripteur
  et ne dit rien du rythme : on la recopie telle quelle, sans doute à écrire ;
  si l'oreille du relecteur y voit autre chose, ça va dans le rapport, pas
  dans le fichier.

## Mesurer : une méthode par famille de source

`inspect.py` nomme la famille ; `check.py` applique la méthode. Ce qu'il faut
savoir pour lire son rapport :

| Famille | Ce qu'on mesure | Exact | À relire | Décalé |
|---|---|---|---|---|
| PDF fr rendu ChordPro (église « Église Protestante Chinoise de Paris © », shir.fr) | le caractère tapé sous lequel le label commence | même caractère (ou même position en l'air) | — | tout autre caractère, même dans la même syllabe ; `[X]mot` là où la partition a `[X] mot` |
| PDF zh ou fr vectoriel (exports Finale : polices Maestro + LiHeiPro) | label → tête de note (≤ 3,5 pt) → caractère centré sous la note (≤ 4 pt) | note et caractère trouvés | label sans note à ± 3,5 pt (en l'air), ou caractère à 4–8 pt de la note | autre caractère |
| Scan 简谱 (repère `public/jianpu/<slug>-p1.webp`, 1 360–1 600 px de large) | bord gauche de l'étiquette du calque ↔ bord gauche du caractère de la bande paroles | ≤ 20 px | 20–45 px | > 45 px |
| Image fr (scan, photo, capture) | bord gauche du label ↔ lettre estimée par position relative dans le mot | ≤ 20 px × largeur/1786 | 20–45 px × largeur/1786 | au-delà |

- **Exact** s'écrit tel quel. **À relire** se tranche sur un crop de la zone
  (rendu 2× du PDF ou découpe du `.webp`, fait dans le scratchpad ; la ligne
  du rapport donne le x et le contexte) et, si l'œil ne tranche pas, devient
  `{needs_review: …}`. **Décalé** se corrige : la ligne du rapport dit devant
  quel caractère la partition pose l'accord.
- Sur un scan 简谱, une étiquette repoussée par un numéro de volta ou un
  crochet de reprise peut sortir des seuils sans être fausse : c'est le
  chiffre du jianpu sous l'étiquette qui tranche. Les arcs de liaison et les
  syncopes ne se voient que sur le crop : `check.py` classe, l'œil décide.
- Quand la partition en porte deux (deux rangées de paroles, deux jeux
  d'accords), chaque rangée se mesure séparément.
- `check.py` compare aussi les paroles après avoir retiré les tirets de
  coupe du transcripteur (`sa - lut`) ; une différence restante est une
  vraie différence.

## Sources de basse fidélité

Feuille Word ou scan dont les accords sont alignés « aux espaces » : la
position vaut ± 1 syllabe. L'accord se pose sur la lettre la plus proche du
label, chaque label à cheval reçoit `{needs_review: …}`, et le rapport est
titré « source basse fidélité ». Au-delà de cinq `{needs_review}`, demander à
Timothée l'audio du chant plutôt que de trancher.

## Deux arrangements du même chant

La partition **fournie** fait foi. Les autres versions se cherchent par
`ls ../Partitions | grep -i "<titre>"` ; le rapport les nomme, dit ce qui
diffère quand leur couche texte se lit (`check.py --source` sur chacune le
mesure), et signale un doublon de la même feuille sous un autre nom
(`La croix seule me suffit （F).pdf`, parenthèse pleine chasse). Un homonyme
qui est un autre chant (`安静 2.pdf`, Hillsong) se signale comme tel.

## Le rapport

C'est la sortie de `check.py` (accords mesurés par classe, structure,
paroles, pinyin) complétée à la main par :

1. le plan déplié (00 § 2) ;
2. la liste des `{needs_review}` avec ce qu'il faudrait pour trancher ;
3. les éléments de la partition non repris (auteurs, traducteur, titre
   original, références, notes de bas de page, seconde tonalité), les thèmes
   défendables non retenus, et ce que l'oreille du relecteur contesterait ;
4. les autres versions présentes dans `Partitions/` et leurs écarts ;
5. les captures de l'étape 6, décrites.

Un rapport sans ligne « à relire » ni `{needs_review}` est la seule preuve
qu'un `.cho` est fini. Un rapport qui en porte est un `.cho` fini **avec ses
questions**, ce qui vaut mieux qu'un `.cho` sans questions et faux.

## Cas tranchés (audits et contre-épreuves du 26/09/2026)

| Partition | Ce qu'on écrit | Pourquoi |
|---|---|---|
| Yahwé, label sur le « i » de « moi » | `mo[A]i` | le caractère de la partition, même dans la syllabe |
| Yahwé, label sur le « l » final de « soleil. » | `solei[A]l.` | idem |
| Océans, D sur le « q » de « j'invoquerai » | `j'invo[D]querai` | idem |
| Abba Père, A sous le premier « s » de « poussière » | `pou[A]ssière` | idem ; `[A]poussière` serait décalé |
| Abba Père, A sous le « e » de « T'aimer » | `T'aim[A]er` | idem |
| Abba Père, E gravé après la virgule de « poussière, » | `poussière,[E]` | label après la ponctuation : après la ponctuation, collé |
| Océans, Bm au-dessus de l'indentation avant « Tu » | `[Bm] Tu m'appelles` | label sur l'espace : crochet + espace |
| La croix seule me suffit, « sa - lut » gravé, F sur « lut » | `sa[F]lut` | tiret du transcripteur retiré, même caractère |
| 一粒麦子, Csus4 gravé sur le temps fort, 生 attaqué une croche avant | `生[Csus4]命` | syncope liée : après la syllabe qui anticipe |
| 一粒麦子, C gravé sur le 3ᵉ temps pendant 命 tenu | `命[C]！` | tenue : après la syllabe, avant la ponctuation |
| 只要有你在我左右, C/D sur 施, G sur la ronde liée depuis 事 | `[C/D]施行奇事[G]。` | tenue : 事 est tenu sous G, l'accord suit la syllabe, la ponctuation vient après |
| 荣耀的呼召, Bb/C entre 力 tenu et la levée 高 | `{start_of_chorus}` `[Bb/C] 高举` | levée de la section suivante, accord avant la voix |
| 安静, refrain qui s'ouvre sur 我不 sans accord gravé | `我不[D]害[D/F#]怕` | rien d'inventé : l'accord précédent continue |
| Au nom de Jésus (scan Word), G au-dessus de « pour \| nous » | `[G]nous` + `{needs_review}` | basse fidélité : lettre la plus proche, doute écrit |
| Abba Père, « F#m D A (x2) » sans paroles | `{start_of_intro: Intro (x2)}` `[F#m]  [D]  [A]` | reprise identique = suffixe |
| Abba Père, la partition s'arrête au Pont sans renvoi | rien d'ajouté, un `{needs_review}` avant la première section concernée, qui nomme tous les retours possibles | le retour du refrain n'est pas gravé |
