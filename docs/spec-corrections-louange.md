# Spec : corrections du mode louange du 14/11 (lot CL)

**Statut : go de Timothée le 14/11/2026 (« Go pour les quatre »), questions tranchées par lui le même jour ; se code en
deux sessions (CL-1 et CL-2, puis CL-3 et CL-4) sur `claude/corrections-design`. La mise en ligne reste à part.**

## Demande (Timothée, 14/11/2026, ses mots)

> « Y'a rien qui va dans le mode louange […] retire les jianpu en 2 colonne c'est illisible, y'a un problème avec les
> annotations, quand j'annote ça fait le trait mais plusieurs fois sur la page à des endroits différents. Quand je suis
> en chiffre les accords sur le jianpu ne passent pas en chiffre non plus. Quand je clique sur un accord pour voir
> comment il se joue, ça fait tourner la page, peut être qu'il faudrait que quand on a activé les idées d'harmonies que
> quand on clique sur un accord ça affiche comment le jouer. Y'a pleins de problèmes je suis pas content »

Puis : « y'a pleins de problèmes d'UI aussi » (sans détail : liste à recevoir, § Relevé d'interface) et « même les
jianpu comme ça séparé c'est pas très lisible peut être que c'est mieux de le laisser en entier pour tous les
responsives ».

## Constats (prouvés le 14/11, tête `92ed345`)

Vus sur le site du mini-PC (compte invité, setlist de Noël avec 恒久恒久以前, fenêtre de 1 357 px, piloté par
agent-desktop) pour 1, 3 et 4 ; reproduit sur le serveur local avec un compte simulé pour 2 (rien n'a été dessiné
dans le compte invité, partagé).

1. **简谱 coupé en demi-lignes.** Ordinateur et tablette paysage : deux colonnes de demi-lignes (JV-4,
   `PerformanceMode.tsx:1112-1116`, `tranchesDeuxColonnes`), reprises et paroles coupées, lecture en zigzag ; marge
   « Affichage » ouverte, c'est encore plus serré. Téléphone debout : demi-lignes empilées (JP-C, `:1110`,
   `tranchesDemiLignes`). Interrupteur « 2 colonnes » éteint : lignes entières, une seule fenêtre par page d'écran.
   La vue Partitions de la setlist pose aussi le scan en deux volets de demi-lignes (JV-3, `useVoletsScan.ts`,
   `PartitionView.tsx`).
2. **Un trait, plusieurs tracés.** `useTraitsAncres.ts:201-213` projette un trait de scan sur **chaque** élément
   `[data-trait-scan]` de son image ; or chaque fenêtre du scan contient sa propre page entière, décalée
   (`JianpuSheet.tsx:775-790`). Un trait donne donc un tracé par fenêtre : six visibles en deux colonnes (tablette
   paysage, huit fenêtres), deux au téléphone debout (quatre fenêtres), un seul en lignes entières (une fenêtre).
   À la pose, `ancrerTrace` (`:89-94`) juge « dedans » sur la page entière et non sur la fenêtre visible : le trait
   est ancré au repère de la première fenêtre, pas de celle où il est dessiné.
3. **« Chiffres » sans effet en louange.** Aucun `NotationAccordsProvider` dans `PerformanceMode.tsx` (rendu des blocs,
   `:160-212`) : `ChordLine`, `ZhLine` et `AccordTouchable` y lisent « lettres » par défaut, alors que la bascule est
   dans la marge « Affichage » du mode louange (RU-5). Les accords en texte et ceux du calque 简谱 restent en lettres ;
   seul le panneau d'un accord passe en chiffres. H7 l'avait laissé ainsi (`spec-harmonie-accords.md:280`, « Restent en
   lettres : le calque 简谱, […] le mode louange ») ; H8 ne l'a pas repris. Sur le calque, une étiquette non touchable
   est rendue brute (`JianpuSheet.tsx:628`).
4. **Un accord touché tourne la page.** `PerformanceMode.tsx:1894-1905` : le tiers gauche et le tiers droit de l'écran
   (30 % sur tablette, `largeurZoneLaterale`) tournent la page même sur un accord ; seul le tiers central ouvre le
   panneau (AL-2, Q1 (a), go du 14/11 au matin). Les deux tiers des accords d'une page tournent donc la page.

## Corrections proposées

- **CL-1, la page du scan entière.** Le mode louange ne découpe plus un scan : chaque page de partition 简谱 tient
  entière sur une page d'écran, réduite pour tenir en hauteur (rendu `fit` sans tranche, celui d'un scan non
  certifié et d'avant JP-B), à toutes les tailles. Dans `PerformanceMode.tsx`, `tranchesDe` ne rend plus de tranche
  (ni `tranchesScan`, ni `tranchesDemiLignes`, ni `tranchesDeuxColonnes`) ; l'interrupteur « 2 colonnes » ne vaut
  plus que pour les chants en texte. La vue Partitions de la setlist revient au scan en une colonne (JV-3 retiré :
  `useVoletsScan.ts`, `PartitionView.tsx`). Restent justes sur la page entière : la pastille « Ensuite », la tête de
  feuille, les Repères (un repère mène à la page du scan qui porte sa section), la demi-page, et, réglage « Idées
  d'harmonie » allumé, les étiquettes de section du rail en face de leurs lignes. Les fonctions de découpe
  (`src/lib/performance/tranchesScan.ts`) et le rendu par tranche de `JianpuSheet`, `PageScan`, `DemiPage` perdent
  leurs appelants : on ne retire que les imports et variables devenus orphelins dans les fichiers touchés ; le
  reste est marqué `shortcut:` et listé dans l'Avancement (Timothée a demandé les deux volets le 13/11 et les
  retire le 14/11 : on garde de quoi revenir tant qu'il n'a pas vu la page entière sur ses appareils). Tests :
  `louange-jianpu-deux-colonnes`, `louange-jianpu-tranches`, `jianpu-deux-volets` et les parties « tranche » de
  `louange-demi-page`, `dispositions-partition`, `harmonie-jianpu` se réécrivent sur la page entière ou se
  retirent quand ils ne décrivent que la découpe. Levée datée dans `spec-jianpu-deux-volets.md` (JV-3, JV-4) et
  `spec-mode-louange-forscore-2.md` (JP-B, JP-C). Critères : 恒久恒久以前 (une page) et 为我而来 (deux pages) entiers à
  l'écran aux cinq projets, calque calé sur l'image, aucune ligne coupée ; un chant en texte garde ses deux colonnes.
- **CL-2, un trait = un tracé.** Après CL-1, une image n'a plus qu'une fenêtre par page d'écran : le défaut
  disparaît sans toucher `useTraitsAncres.ts`. La tranche est un test de non-régression : sur un scan, un trait
  dessiné donne un seul tracé, là où il est dessiné, aux trois appareils (page d'un chant d'une page et de deux
  pages). Moyen au choix, sans attribut ajouté au code pour le seul test. Si le test montre encore un double, la
  correction est celle du constat 2 (projeter dans la seule fenêtre qui contient le point de départ, ancrer au
  repère de la fenêtre touchée).
- **CL-3, « Chiffres » en louange.** Chaque bloc du mode louange (texte et scan) reçoit la notation du compte et la
  tonalité des étiquettes affichées de son chant (capo déduit, section modulée dans sa tonalité, comme H7-1). Sur le
  calque 简谱, toute étiquette passe par `etiquetteAffichee`, touchable ou non ; le calque suit donc aussi la bascule
  sur la page chant et en vue Partitions. Le PDF reste en lettres. Tests : `notation-accords` (le calque change
  désormais), `louange-reglages` ou `louange-accords` (FR et 中文).
- **CL-4, accord touché.** Q3 (a), l'idée de Timothée : réglage « Idées d'harmonie » allumé, un accord
  touché ouvre son panneau partout, bandes latérales comprises ; la page se tourne en touchant hors d'un accord, par
  balayage, au clavier ou à la pédale. Réglage éteint : les accords sont inertes et tout toucher tourne la page ou
  bascule la barre, comme avant AL-2. Fichiers : `PerformanceMode.tsx` (`handlePointerUp`, `AccordsProvider actif`),
  `louange-accords.spec.ts`. Levée datée de Q1 et Q2 dans `spec-accords-louange.md`.

Ordre : CL-1, CL-2, CL-3, CL-4 (`PerformanceMode.tsx` : une à la fois). Petites tranches voisines : CL-1 et CL-2
dans une session, CL-3 et CL-4 dans la suivante, lancée par la première.

## Questions tranchées par Timothée (14/11/2026)

**Réponses : Q1 (c) la page du scan entière ; Q2 (a) deux volets retirés partout ; Q3 (a) selon « Idées d'harmonie » ;
go pour les quatre corrections.** Les énoncés, tels que posés :

- **Q1. « En entier ».** (a) **Recommandé** : lignes entières partout, téléphone debout compris (chiffres plus
  petits au téléphone : on le tourne ou on zoome). (b) Lignes entières sur tablette et ordinateur, demi-lignes
  gardées au téléphone debout. (c) La page du scan entière à l'écran, sans aucune coupe.
- **Q2. Vue Partitions de la setlist.** (a) **Recommandé** : retirer les deux volets de 简谱 là aussi. (b) Mode
  louange seulement.
- **Q3. Accord touché.** (a) **Recommandé** : selon le réglage « Idées d'harmonie » (ci-dessus). (b) L'accord s'ouvre
  partout, quel que soit le réglage. (c) Ne rien changer.

## Relevé d'interface

Timothée, 14/11 : « y'a pleins de problèmes d'UI aussi », « pas que dans le mode louange partout sur le site ». Le
relevé se fait à part, sans code : parcours à l'œil de tout le site, livrable `docs/parcours-oeil-2026-11-14.md`
(session `session_01UMdfuYxHihNxNeVptAXVGj`, une session Opus et deux agents `regard` au plus). Timothée choisit
ensuite ce qui se corrige. Déjà vus pendant les constats ci-dessus et transmis à ce parcours : le panneau d'un accord
dépasse du bas de la fenêtre à l'ordinateur (« Voir tout le dictionnaire » sous les points de page) ; la marge
« Affichage » s'ouvre d'elle-même à la première entrée en mode louange et prend 320 px.

## Avancement

- 14/11/2026 : constats et spec (session « corrections du mode louange »). Réponses et **go de Timothée** le même
  jour (ci-dessus). CL-1 et CL-2 lancées dans une session orchestratrice (`session_01UMdfucmd8vZDo4rAt5qL3z`) ; elle lance CL-3 et CL-4.
