# Retouches du 21/11/2026 — fenêtre « Affichage », thème, mode louange, fenêtre Harmonie

Demandes de Timothée du 21/11/2026 (deux enregistrements d'écran iPhone, deux captures Safari), causes trouvées dans
le code le jour même, décisions et go donnés dans la conversation « Problèmes de fenêtre affichage ». Une tranche par
session (`CLAUDE.md`, § Coder). Le lot « Un passage ou tous » du Crayon est à part : `docs/spec-ma-partition.md`.

## R1 — Fenêtre « Affichage » : poignée, page derrière, étiquette (go : « go avec la poignée qui marche »)

Ses mots : « il y a un petit rectangle en haut de la fenêtre "affichage" qui montre qu'on peut soit tirer la fenêtre
vers le haut soit vers le bas mais ça ne fonctionne pas et c'est pour ça qu'à la fin de la video la section avec la
partition ça glisse en haut et en bas ».

Causes : la poignée de la feuille (`MargeAffichage.tsx`) était un trait décoratif ; rien ne retenait le défilement
dans la feuille ; la feuille est dans la zone du geste Liste ↔ Partitions (`useSwipeViews`), donc un doigt sur la roue
des couleurs emmenait la vue ; le nom de section cliquable (`NomSection`, `SongView.tsx`) était en `z-10` comme les
barres fixes et se peignait par-dessus le titre de la barre.

Décidé : feuille à 40 % à l'ouverture, **85 % en tirant ou en touchant la poignée** (change RU-2 de
`spec-reglages-unifies.md`, qui fixait 40 %), tirer vers le bas ramène à 40 % puis ferme ; `overscroll-contain` sur le
corps, `touch-action: none` sur la poignée et le titre ; `data-sans-glissement` sur la feuille, ignoré par
`useSwipeViews` ; `NomSection` en `z-[1]`. Faite dans la session d'origine.

Inventaire des autres feuilles du bas (chercheur, 21/11, lu dans le code, pas à l'écran) : 30 passent par
`ui/drawer.tsx` (vaul), dont la poignée ferme en tirant vers le bas ; « Prévenir des changements » n'a pas de poignée.
Aucune autre poignée dessinée sans geste. Reste à voir à l'écran : le menu du mode louange (`MenuLouange.tsx:143`).

## R2 — Thème sur ordinateur, barre latérale dépliée (go : « corrige ça »)

Ses mots : « regarde sur chaque responsive là où on peut changer le thème de l'application parce que je ne la trouve
pas sur ordinateur ».

Cause : pour un membre, `BarreLaterale.tsx` ne rend le bouton lune/soleil que barre réduite (`{enIcones && theme}`,
ligne 383) ; barre dépliée, il n'y a que la cloche et la langue, et la barre du haut (qui a un bouton) est masquée dès
que la barre latérale est montrée. Reste Moi → Réglages → Thème, absent des espaces Back-Office et Musiciens.
C'était la décision Q4 de `spec-navigation-grand-ecran.md` (« le bouton de thème d'un membre passe dans Moi ») :
**elle est levée pour la barre dépliée** (Timothée, 21/11).

À faire : le bouton de thème au pied de la barre latérale dépliée d'un membre, à côté de la langue, même pastille ;
la forme d'attente (`attente`) garde la même largeur ; le nom reste tronqué proprement à 1 024 px. Adapter les tests
qui affirment son absence (`git grep -n "modeSombre\|modeClair" tests`), en ajouter un : membre, barre dépliée, le
bouton bascule le thème. Hors périmètre (pas de go) : le visiteur sans compte sur téléphone n'a aucun bouton de thème
(`Navbar.tsx:258`, `hidden sm:flex`) ; à signaler à Timothée, ne pas corriger.

## R3 — Mode louange : la page derrière ne défile plus (go : « go »)

Ses mots : « pourquoi il y a deux barre verticales à droite, quand je scroll ça scroll les partitions qui sont en
arrière plan alors que dans le mode louange on ne devrait pas pouvoir scroller ».

Cause : le mode louange est une couche `fixed inset-0` (`PerformanceMode.tsx:2150`) par-dessus la page, qui reste
montée et défilable ; aucun verrou. La barre de droite est celle du document ; l'autre, celle de la colonne
« Affichage », est normale.

À faire : tant que `PerformanceMode` est monté, `document.documentElement.style.overflow = "hidden"`, valeur d'avant
rendue au démontage (un effet, quelques lignes, aucun reformatage : d'autres sessions touchent ce fichier). Vérifier
que la sortie du mode ramène bien au chant lu. Test : en mode louange, la molette ne change pas `window.scrollY` et le
document n'a plus de barre ; à la sortie, le défilement revient. Ordinateur, tablette, téléphone.

## R4 — Fenêtre Harmonie du mode louange : à côté de la section, et déplaçable (go : « je suis d'accord », puis « go »)

Ses mots : « l'onglet harmonie cache les paroles en dessous c'est pas pratique surtout quand on veut voir les accords
de la section en elle même » ; « il faudrait aussi pouvoir déplacer la fenêtre à notre guise sur la partition du mode
louange sur tablette et ordinateur ».

Cause : `Fenetre` (`HarmonieDuChant.tsx:169`) est un popover Radix `side="bottom" align="start"` accroché au nom
touché : il s'ouvre sur la section. Décision du 13/11 (fenêtre plutôt que colonne) gardée ; seul le placement change.

Décidé (croquis montré à Timothée le 21/11) :
- **Placement** : à droite du *texte* de la section touchée, haut aligné sur le nom. Pas la place à droite : à
  gauche (sur l'autre colonne). Aucun côté : calée contre le bord droit de l'écran, le nom et le début des lignes
  restent visibles. Étiquette d'un scan 简谱 (`[data-jianpu-etiquette]`, pas de `[data-section]`) : placement
  d'aujourd'hui. Téléphone (feuille du bas, < 768 px) : rien ne change.
- **Déplacement** (≥ 768 px) : on tire la fenêtre par son en-tête, souris, doigt ou stylet ; elle reste où on l'a
  posée tant qu'elle est ouverte ; à l'ouverture suivante elle revient à côté de la section touchée. Le × reste un
  bouton ; l'en-tête ne sort jamais de l'écran ; la flèche du popover disparaît une fois la fenêtre déplacée.

Pistes de code (à vérifier, pas imposées) : ancre virtuelle = boîte du texte de la section
(`ancre.closest("[data-section]")`, bord droit = le plus à droite des nœuds de texte, par `TreeWalker` et `Range` :
`Range.getClientRects` sur la section rendrait la pleine largeur des blocs) ; `side="right" align="start"`, Radix
bascule à gauche ; il ne décale pas en largeur, donc le troisième cas se règle en bornant le bord droit de l'ancre.
Déplacement : propriété CSS `translate` sur le contenu (le `transform` appartient à Radix), écouteurs `pointermove` /
`pointerup` sur `window` posés au `pointerdown` (une capture posée après coup rate les premiers mouvements à la
souris : défaut trouvé sur la poignée de R1), `touch-action: none` sur l'en-tête, remise à zéro à chaque ouverture
(`passage.cle`). Tests : la fenêtre ne recouvre pas le texte de la section (deux colonnes, une colonne), tirer
l'en-tête la déplace, le × ferme, la réouverture la replace ; cinq projets (spec d'agencement). Captures à regarder
sur tablette portrait, tablette paysage, ordinateur et 1 440 px.

## Avancement

- 21/11/2026 : causes trouvées, décisions et go notés ci-dessus (session d'origine). R1 codée par un `executant`,
  premier tour de tests en cours.
- 21/11/2026 : **R1 faite** (session d'origine ; `executant`, `testeur`, relecture du diff et captures par la session).
  Premier tour (marge-affichage, page-chant-reglages, harmonie-volet-section, couleur-accords, cinq projets) : 675 tests,
  624 passés, 34 ignorés, 17 échecs en 19,6 min, ramenés à : un défaut réel (la poignée ne suivait pas la souris : la
  capture du pointeur arrivait après les premiers mouvements ; corrigé par des écouteurs sur `window` posés au
  `pointerdown`), deux tests neufs mal montés (corrigés) et **`couleur-accords.spec.ts:184` rouge sur les cinq projets,
  rouge aussi sur la tête de branche sans la retouche** (couleur des icônes par compte en mode louange, `#1c1c1e` au
  lieu de `#3f63cf`) : à reprendre à part. Tour final de `marge-affichage.spec.ts` : 128 passés, 7 ignorés, 0 échec,
  3,4 min. Captures regardées : téléphone et tablette portrait, FR et 中文, à 40 % et 85 %. Le geste au doigt n'est
  couvert que pour le glissement Liste ↔ Partitions (CDP) ; tirer la poignée au doigt reste à voir sur un vrai iPhone.
  Reste de R1 : voir à l'écran la poignée du menu du mode louange (`MenuLouange.tsx:143`).
- 21/11/2026 : R2 et R3 lancées ensemble (`session_01UMdfudBb2wu91QRj7iKtL9`), R4 lancée
  (`session_01UMdfuZzn5R3Lgirrn7Mgo7`) ; lot « Un passage ou tous » : UP-1 (`session_01UMdfud4YdWDfdt7w7qhm9R`) et
  UP-3 (`session_01UMdfudKDfdFHnco4rsCnMm`), suivi dans `docs/spec-ma-partition.md`.
- 21/11/2026 : **R2 faite.** Bouton de thème au pied de la barre dépliée d'un membre (`BarreLaterale.tsx`, après la
  langue, même pastille ; forme d'attente à trois pastilles) ; note Q4 levée dans `spec-navigation-grand-ecran.md` ;
  test ajouté (ordinateur, membre, barre dépliée, le bouton bascule le thème), absence → présence dans le test du pied.
  Tests (`navigation-grand-ecran`, `back-office-admin`, `agencement-barre-reduite`, cinq projets, 10,7 min) : 382
  passés, 7 échoués, tous déjà sur HEAD sans le diff (libellé « Chants » doublé dans le rail réduit ; deux renvois du
  back-office vers le Calendrier), hors R2, à reprendre ailleurs. Captures 1 024/1 280/1 440, clair/sombre, FR/中文 :
  OK ; à toutes ces largeurs la barre fait 248 px, le nom du membre n'a plus qu'environ 40 px (« Rut… », ellipse
  nette). Signalés sans correction : forme d'attente en barre réduite à une seule pastille fantôme contre trois boutons
  (antérieur) ; visiteur sans compte sur téléphone sans bouton de thème (`Navbar.tsx:258`, hors périmètre, à Timothée).
- 21/11/2026 : `couleur-accords.spec.ts:184` **corrigé** (Timothée, « corrige ») : le test attendait l'ancien bleu
  `#3f63cf` pour un compte sans clé ; le défaut est l'encre depuis RU-5 (`COULEUR_DEFAUT`). Le code était juste, le test
  en retard. Vert sur les cinq projets (55 s avec `i18n-hydration`).
- 21/11/2026 : **thème du visiteur sur téléphone** (Timothée, « Go ») : le bouton rendu visible dans la barre du haut
  fait déborder la rangée (captures à 360 px : « Connexion » coupé à droite, « 登录 » sur deux lignes ; à 412 px le
  bouton touche le bord). Non commité : choix demandé à Timothée (« Connexion » en icône seule sous 430 px, nom du site
  masqué, ou pas de bouton de thème sur téléphone). Le test ajouté mesurait `scrollWidth` de `header > div`, qui ne voit
  pas ce débordement : à refaire sur la boîte du bouton « Connexion » (bord droit ≤ largeur de la fenêtre).
- 21/11/2026 : **thème du visiteur sur téléphone, fait** (Timothée, « go » sur « Connexion » en icône seule sous
  430 px) : le bouton de thème du visiteur est visible à toutes les largeurs (`Navbar.tsx`), « Connexion » n'affiche
  son mot qu'à partir de 430 px (icône seule en dessous, nom accessible gardé, « 登录 » sur une ligne). Test refait sur
  les boîtes des boutons à 360, 412 et 430 px (`i18n-hydration.spec.ts`, projet téléphone) : vert, 22 s. Captures
  regardées à 360, 412 et 430 px, FR et 中文 : tout tient, marge droite gardée.

- 21/11/2026 : **R4 faite** (`session_01UMdfuZzn5R3Lgirrn7Mgo7` ; `/tranche` puis deux reprises). `Fenetre`
  (`HarmonieDuChant.tsx`) : dès 768 px et dans une section, ancre = boîte du texte de la section (TreeWalker + Range),
  `side="right"`, bascule à gauche par Radix, sinon calée au bord droit ; hauteur bornée à l'espace sous le nom
  (plancher 50 % de l'écran) pour que le haut reste sur le nom ; en-tête déplaçable (`translate`, écouteurs sur
  `window`, bornes, flèche ôtée une fois déplacée, remise à zéro à chaque ouverture). Téléphone et étiquette de scan
  简谱 : placement d'avant, sans déplacement au téléphone. Tests : `harmonie-fenetre-placement.spec.ts` (nouveau, dans
  `SPECS_GRAND_ECRAN` : cas droite/gauche/calée annotés, déplacement, ×, réouverture, téléphone moitié basse, étiquette
  简谱) ; `louange-harmonie.spec.ts` adapté (à côté du nom au lieu de dessous). Passe des trois specs, cinq projets :
  182 passés, 37 sautés, 1 échec, 10,2 min ; après la borne de hauteur, deux specs, cinq projets : 117 passés, 1 rouge
  corrigé (condition du test alignée sur le plancher), 7,4 min ; relance du test corrigé : verte. Échec connu hors tranche : A9 de
  `louange-harmonie.spec.ts:200` au téléphone (page 2 d'un scan retombe à 1 ~8 s après l'ouverture, sans geste : la fin
  du chargement du planning reconstruit `blocks` et l'ancre d'un scan ne garde pas sa page, `blocks.ts:496-513`) ;
  rouge 3 fois sur 4, vert au dernier tour ; à reprendre à part. Captures (ordinateur, 1 440, tablette portrait et
  paysage, FR et 中文) triées par `regard`, `critique-design` : « bon ». Finitions laissées : marge du cas calé
  (≈ 17 px au bord ; aligner sur le bord des cadres, ≈ 24 px), flèche presque invisible sur fond blanc, ombre légère
  sur tablette. Non vu à l'écran : déplacement au doigt ou au stylet sur un vrai appareil, thème sombre.
- 21/11/2026 : **R3 faite.** Un effet dans `PerformanceMode.tsx` (six lignes, aucun reformatage) : `overflow: hidden` sur
  `<html>` tant que le mode louange est monté, valeur d'avant rendue au démontage ; la sortie démonte seulement le mode
  et laisse la page de la setlist à sa place. Test ajouté à `performance-mode.spec.ts` : en mode louange la molette ne
  change pas `scrollY` et le document n'a plus de barre ; à la sortie, même position, `overflow` rendu, la molette
  défile de nouveau (ordinateur, tablette, téléphone). Le clic sur « Mode Louange » ramène lui-même la page en haut :
  le test défile donc dans le mode avant la sortie. Tests (`performance-mode`, `louange-menus`,
  `louange-parcours-culte`, `mode-louange-forscore`, cinq projets, 41 min) : 680 passés, 2 échoués, les deux déjà là
  sans R3, au test B1 de `louange-menus` (feuille « Affichage », zone de R1) : tablette, « haut » 29 px au lieu de
  moins de 24, constant ; ordinateur-1440, le × change de page, une fois sur huit sans R3 (instable). À reprendre
  avec R1.
- 21/11/2026 : **suite de R1** (session d'origine). Le rouge constant de `louange-menus.spec.ts:763` (B1) sur tablette
  venait bien de R1 : la poignée de la feuille « Affichage » est devenue un bouton de 24 px, le × est à 29 px du haut
  au lieu de 20, et le test n'accordait 48 px qu'aux feuilles sous 768 px. Test aligné : « Affichage » en feuille est
  une feuille à poignée jusqu'à 1 024 px. Vert sur téléphone, tablette, tablette paysage et ordinateur (1,6 min).
  L'autre rouge de B1 (ordinateur-1440, le × change de page une fois sur huit) existait sans R1 ni R3 : à reprendre à part.

