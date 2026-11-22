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

## R5 — Tests déjà rouges sur la branche (go : « Oui », 21/11/2026)

Timothée a dit oui à « je m'occupe de ces tests déjà rouges ». Aucun ne vient des retouches R1 à R4 ni du lot « Un
passage ou tous » : chacun a été vu rouge sur la tête de branche sans le diff de la session qui le signale.

Méthode, pour chaque test : le rejouer seul sur le projet cité ; lire l'erreur ; dire si le **test** est en retard
(une décision plus récente a changé le comportement : citer la spec ou le commit, puis aligner le test) ou si le
**site** a un défaut (le corriger s'il tient en quelques lignes sans décision nouvelle ; sinon l'écrire ici, avec la
cause prouvée par `chemin:ligne`, et s'arrêter sur ce point). Jamais de test sauté, désactivé ou assoupli pour passer
au vert sans cause établie. Un test instable : trouver la course, pas allonger un délai.

**R5a — Navigation et back-office** (indépendant du Crayon, peut partir tout de suite) : 7 échecs vus par la session
de R2 dans `navigation-grand-ecran`, `back-office-admin` et `agencement-barre-reduite` (cinq projets) : le libellé
« Chants » doublé dans le rail réduit ; deux renvois du back-office vers le Calendrier. Plus les « 3 rouges
préexistants dans `coherence.spec.ts` » signalés par la session du lot AS, T2 : à rejouer, peut-être déjà verts.

**R5b — Mode louange et annotations** (après la fin du lot « Un passage ou tous » : mêmes fichiers) :
- `louange-harmonie.spec.ts:200` (A9), téléphone : la page 2 d'un scan retombe à 1 environ 8 s après l'ouverture, sans
  geste ; piste de la session de R4 : la fin du chargement du planning reconstruit `blocks` et l'ancre d'un scan ne
  garde pas sa page (`src/lib/performance/blocks.ts:496-513`). Rouge 3 fois sur 4 : sans doute un vrai défaut.
- `annotations-forscore.spec.ts`, test (z), téléphone ; test (v) préréglages, ordinateur-1440 (passe seul, instable
  sous charge).
- `louange-sections-uniques.spec.ts:358` (C1), ordinateur-1440.
- `louange-menus.spec.ts:763` (B1), ordinateur-1440 : le × change de page une fois sur huit.

## R6 — Mode louange lent à 1 440 px : la mesure des lignes d'accords (go : « Go pour les deux », 21/11/2026, nuit)

Constat de R5b (§ Avancement, point C1) : à 1 440 px, ouvrir le mode louange prend 10 s (3,4 s à 1 280 px) et passer
de « Plan » à « Tout le chant » 5,8 s (0,5 s). Profil : 3,2 s dans l'effet de mesure de `ChordLine`
(`src/components/song/ChordLine.tsx:211-268`, une mise en page forcée par ligne) et 2,1 s dans `document.fonts.ready`
appelé au montage de chaque ligne (`:201-206`).

À faire : regrouper les lectures et les écritures de la mesure (toutes les lectures, puis toutes les écritures, pour
l'ensemble des lignes ou au moins sans mise en page forcée par ligne) et n'avoir qu'un seul abonnement aux polices
pour toutes les lignes. **Le rendu ne change pas** : mêmes positions d'accords au pixel près, sur toutes les pages qui
montrent des lignes d'accords (page chant, setlist, mode louange), FR et ZH.

Réussite : (1) à 1 440 px, « Plan » → « Tout le chant » sous 1,5 s et l'ouverture nettement plus rapide (mesures
avant et après écrites dans l'Avancement, même machine) ; (2) `louange-sections-uniques:358` (C1) vert sur
ordinateur-1440 sans allonger son délai ; (3) positions des accords identiques avant et après, prouvé par une
comparaison mesurée (boîtes des accords d'un chant FR et d'un chant ZH, aux cinq largeurs) ; (4) les specs des
accords et du mode louange voisines restent vertes. Si la cause s'avère ailleurs que dans `ChordLine`, ou si le gain
demande de changer le rendu, s'arrêter et l'écrire.

## R7 — Mode louange : « Ensuite : … » après la dernière section (go : « go », 21/11/2026, nuit)

Mots de Timothée (capture du mode louange sur écran large, deux colonnes) : « peut être que c'est mieux de mettre le
ensuite à droite à la toute fin des sections ». Sur la capture, la pastille « Ensuite : Je veux proclamer… » est en
bas de la colonne de gauche, alors que la lecture continue dans la colonne de droite.

À faire : quand la dernière page d'un chant s'affiche sur plusieurs colonnes, la pastille du flux
(`PerformanceMode.tsx`, `pastilleSuivant`, `layout[…].suivant` ; `src/lib/performance/pagination.ts`) se place après
la dernière section, donc au bas de la dernière colonne qui porte du texte. Sur une colonne : inchangé. Les replis
existants (pastille posée en absolu quand la pagination ne lui a pas gardé de place, quand la barre du bas la couvre,
en demi-page, à côté d'un scan) ne changent pas. Aucune section ne change de page ni de colonne à cause du
déplacement ; si ce n'est pas tenable, s'arrêter et l'écrire.

## R8 — Tests rouges du mode louange relevés la nuit du 21 au 22/11 (go : « Go corrige », 22/11/2026)

Relevés par R6, UP-7 et R7, tous rouges aussi sans ces retouches : `dispositions-partition:752` et `:795`,
`louange-demi-page:157`, `louange-coupure:172` (rotation au téléphone), `rappel-ordre-joue:423`, `barre-titre:142` et
`:285`, `usage-dimanche:221`, `:238`, `:330`, `:339`, `rappel-indice:178` (中文, téléphone). Causes déjà notées dans
la ligne d'Avancement de R7 pour sept d'entre eux (corrections écrites, non commitées, dans le conteneur de R7).

Règle, comme en R5 : un test en retard sur une décision du site s'aligne, avec la décision citée (spec, commit) ; un
défaut du site ne se maquille pas : s'il tient en quelques lignes sûres, on le corrige et on le dit, sinon on
s'arrête sur ce point et on l'écrit. Aucun test sauté, désactivé ou assoupli (délai allongé, attente retirée).

## R9 — Mode louange au téléphone : la rotation remet le texte à la bonne largeur (go : « Fait le 2-3-4 », 22/11/2026)

Défaut trouvé par R8 (`louange-coupure:172`, rotation au téléphone, § Avancement de R8) : la page réduite
(`src/lib/performance/columns.ts:99`) compense la largeur (`PageTexte.tsx:78`), si bien que le texte se pose sur
870 px alors qu'il a été mesuré à 715 px : après une rotation, des lignes se coupent ou débordent.

À faire : le texte s'affiche à la largeur où il a été mesuré (ou se mesure à la largeur où il s'affiche), au plus
petit changement. Réussite : `louange-coupure:172` vert au téléphone sans toucher au test ; aucune ligne coupée après
une rotation dans les deux sens, chant FR et chant ZH (capture regardée) ; la pagination sans rotation ne change pas
(mêmes sections par page, cinq projets). Voisins à dire sans les réparer s'ils ne tombent pas avec : 
`rappel-ordre-joue:449` et `:482` (téléphone), `louange-reglages:123` (Chiffres en mode louange).
Ensuite : la session lance P3 (`docs/audit-performance-2026-11-21.md`, § 7).

## R10 — Harmonie en setlist et en mode louange : sans idées de forme ni montée de ton (22/11/2026)

Mots de Timothée : « dans les idées d'harmonie qui s'affichent dans le mode louange et dans la partition des setlists
enlève les sections "intro après la fin du refrains", "le tag : répéter la dernière phrase" et même les propositions
pour monter de gamme généralement on le fait pas ».

Fait : dans la partition d'une setlist (`IdeesDuChant.tsx`) et en mode louange (`VoletHarmonie.tsx`), la fenêtre
Harmonie ne montre plus les idées « Intro avec la fin du refrain » et « Tag », ni les cartes de montée de ton
(option `sansFormes` de `HarmonieDuChant`, `harmonieDuChant`, `suggestionsPour`). La page d'un chant les garde (il
n'en a pas parlé : à lui de dire s'il veut les retirer aussi). Le sélecteur 升调 de la setlist ne change pas : on peut
toujours poser une montée de ton à la main. Code laissé en place, plus appelé depuis une setlist : le `onModuler` de
`IdeesDuChant.tsx` et les cartes de modulation de `HarmonieDuChant.tsx` (à retirer si la décision se confirme).

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
- 21/11/2026 : **R5 ajoutée** (Timothée, « Oui »). R5a lancée tout de suite ; R5b à lancer par la session qui finit
  le lot « Un passage ou tous » (écrit dans ses Tranches, `docs/spec-ma-partition.md`).
- 21/11/2026 : **R5a faite** (session R5a). Rejoués : `navigation-grand-ecran`, `back-office-admin`,
  `agencement-barre-reduite`, `coherence`, cinq projets : 8 échecs, tous des **tests en retard**, aucun défaut du site ;
  `coherence` et `agencement-barre-reduite` déjà verts (les « 3 rouges » du lot AS ne reviennent pas). (1) Rail réduit,
  `navigation-grand-ecran:491` (ordinateur, ordinateur-1440), `:716`, `:750`, `:942` (tablette-paysage) et
  `back-office-admin:624` (tablette-paysage) : CI-17 (B13, validée par Timothée le 15/11, `spec-corrections-interface.md`
  § Avancement) met le nom sous chaque icône (`BarreLaterale.tsx:315`), d'où « Chants » deux fois dans le lien
  (libellé caché + nom affiché), entrée en pleine largeur du rail (`!w-full`, `:310`, 47 × 44 au lieu de 44 × 44) et
  langue au pied du rail (Q5 révisé, `:383`). Tests alignés : `.barre-texte` caché et nom sous l'icône visible ; texte
  lu par `innerText` ; 44 px de haut, 44 px de large au moins, dans la barre ; langue visible au pied. (2)
  `back-office-admin:525` et `:581` (ordinateur-1440) : BO-C (`eaeb6b2`) redirige `/back-office/reunions` et
  `/evenements` vers le Calendrier filtré ; à 1 280 px le test attrapait l'adresse intermédiaire (course) : il attend
  maintenant l'adresse finale. Tests : premier passage 9,6 min (417 passés, 8 échecs) ; reprise des 7 tests 56 s ; tour
  final des quatre specs 9,3 min (423 passés, 189 ignorés, 1 test rouge sur deux projets : la langue, cachée derrière
  l'échec précédent), puis ce test seul vert (12 s). Reste : rien pour R5a ; R5b non touchée.
- 21/11/2026, soir : **R1, défaut corrigé** (vidéo de Timothée, iPhone : la fenêtre « Affichage » déjà à 85 % part
  par le haut de l'écran, le titre et la croix disparaissent). Cause : au lâcher, le geste vidait la hauteur posée à la
  main (`height = ""`), ce qui effaçait aussi celle de React ; quand l'état ne changeait pas (fenêtre déjà haute tirée
  encore, ou geste annulé), rien ne la remettait et la feuille prenait la hauteur de son contenu. Le geste remet
  maintenant la hauteur de l'état (`MargeAffichage.tsx`, `lache`). Trouvé en écrivant le test : à la souris, tirer la
  zone de prise sélectionnait le texte de la page, et le geste suivant était annulé (glisser-déposer du texte) :
  `select-none` sur la zone de prise. Test ajouté dans `marge-affichage.spec.ts` (rouge sans le correctif : 1 044 px
  au lieu de 713). Spec entière sur les cinq projets : 128 passés, 7 ignorés, 3,2 min. Au doigt sur un vrai
  téléphone : à revoir par Timothée.
- 21/11/2026 : **R5b faite en partie** (session R5b). (1) **A9** (`louange-harmonie:200`, téléphone) : **défaut du site**,
  corrigé. `ancreDeLecture` ne gardait d'une page de scan ni section ni uid : à la reconstruction des blocs (fin du
  chargement du planning), `retrouverAncre` ne retrouvait que l'en-tête, d'où la page 2 qui retombait à 1. L'ancre
  garde maintenant la page du scan (`src/lib/performance/blocks.ts:496-516`) ; cas pur ajouté dans
  `nettoyage-louange-pures` (rouge sans le correctif). A9 vert 4 fois sur 4 au téléphone. (5) **`coup-d-oeil:215`** :
  **test en retard**. « Une fois chacune » (`margeAffichage.ordreUnique`, `fr.json:696`, zh « 每段一次 ») vient du lot
  AT (`a025b4d6`, 17/11), pas d'UP-4 ; libellé du test aligné. (2) **(z)** (`annotations-forscore`, téléphone) :
  **test en retard**. L'indice du rappel (`IndiceRappel.tsx`, 17/11) se pose en bas au centre et garde le toucher qui
  le ferme (`:73-77`) : le « ff » tombait dessus. Le test le marque déjà vu, comme le test (f). **(v)**
  (ordinateur-1440) : 6 fois sur 6 vert seul, rouge une fois sous charge (`[data-performance-mode]` absent après
  rechargement du compte B, `:756`) ; course non trouvée, rien changé. (4) **B1** (`louange-menus:763`,
  ordinateur-1440) : 8 fois sur 8 vert (1,3 min), plus 4 sur 4 par la relecture : le « une fois sur huit » ne se
  reproduit pas ; rien changé. (3) **C1** (`louange-sections-uniques:358`, ordinateur-1440) : **défaut du site,
  non corrigé** (arrêt sur ce point, comme le veut la méthode). Ce n'est pas une course : le test dépasse ses 30 s
  parce que le site est lent à 1 440 px. Ouverture 10 s (3,4 s à 1 280 px), changement Plan → Tout le chant 5,8 s
  (0,5 s). Le nombre de passes de pagination est le même aux deux largeurs. Profil CPU du changement : 7,3 s, dont
  3,2 s dans l'effet de mesure de `ChordLine` (`src/components/song/ChordLine.tsx:211-268` : lit `clientWidth` et
  `getBoundingClientRect` après avoir remis les styles à zéro, une mise en page forcée par ligne) et 2,1 s dans
  `document.fonts.ready`, appelé au montage de chaque ligne (`:201-206`), qui force aussi un recalcul. Corriger
  touche la mesure de toutes les lignes d'accords (regrouper lectures et écritures, un seul abonnement aux polices) :
  plus que quelques lignes, à décider en retouche à part ; le délai du test n'a pas été allongé. Voisin :
  `louange-harmonie:133` (toucher dans le volet, téléphone) rouge une fois sur huit **aussi sur la base** (ZH), déjà
  là avant R5b. Tests : les cinq specs de R5b + `nettoyage-louange-pures`, cinq projets, `--workers=2` : 987 passés,
  3 échecs (C1, (v), `louange-harmonie:133`, tous expliqués ci-dessus), 42 ignorés, 42 min ; tsc propre. Reste : C1
  (lenteur de `ChordLine` à 1 440 px), (v) et `louange-harmonie:133` (instables sous charge, course non trouvée).
- **R6 fait (21/11/2026, nuit)** — `ChordLine` : la mesure de toutes les lignes d'un rendu passe par une file commune
  vidée en microtâche (lectures de largeur et de corps pour toutes les lignes, puis remise à zéro du resserrage, puis
  lecture des boîtes, puis écritures et coupures en un seul `flushSync`) ; un seul `document.fonts.ready` partagé par
  les lignes montées pendant l'attente. Cause confirmée avant de coder (profil CPU de « Plan » → « Tout le chant » à
  1 440 px : 7,3 s sur 9,7 s dans l'effet de mesure, dont 2,65 s de `getBoundingClientRect` ; 0,8 s après). **Rendu
  identique** : boîtes de tous les accords (page chant `abba-pere` et `为我而来`, page setlist en Partitions, mode
  louange page par page ; 26 + 16 + 32 + 32 lignes, 343 accords) aux cinq projets, relevées avant et après : 0 écart
  (deux relevés « avant » identiques entre eux). **Temps** (`next dev`, même machine, mode louange de C1 à 150 %) :
  1 440 px, ouverture 11,0 / 9,2 s → 4,4 / 2,1 s ; « Plan » → « Tout le chant » 7,1 / 9,0 / 7,8 s → 1,0 / 1,0 / 1,5 s ;
  1 280 px, ouverture 2,7 / 1,5 s → 3,4 / 1,5 s, « Tout le chant » 0,8–1,2 s → 0,8–1,1 s (inchangé). Demande du
  pilote (Timothée, ~1 500 px, setlist de quatre chants) : lancer le mode louange 10,5 / 12,4 / 12,8 s → 6,1 / 5,1 /
  5,5 s ; activer le Crayon 0,6–0,7 s → 0,5–0,8 s, **non reproduit lent ici** et sans lien avec `ChordLine` (aucune
  autre cause vue dans ce chemin). Reste du lancement après R6 (profil) : surtout le rendu React de développement
  (`jsxDEV` 1,5 s, rendu des lignes 1,1 s), la mesure groupée 0,9 s ; une build de production n'a pas été mesurée.
  Tests : `louange-sections-uniques`, `coupure-vers`, `louange-coupure`, `lignes-accords`, `louange-accords`,
  `dispositions-partition`, `louange-demi-page`, `mode-louange-colonnes`, `agencement-v18-chants`, cinq projets,
  `--workers=2 --trace off` : 1 037 passés, 23 échecs, 177 ignorés, 55 min ; `louange-sections-uniques:358` (C1) vert
  aux cinq projets, délai inchangé. Les 23 échecs tombent dans quatre tests **rouges aussi sur la base** (repassés
  sur une copie de `1d4bb50`, mêmes erreurs) : `dispositions-partition:752` et `:795` (rangée des miniatures sur deux
  lignes), `louange-demi-page:157` (moitié basse vide sous le filet), `louange-coupure:172` (rotation au téléphone :
  aucune copie de même largeur) ; non corrigés, hors R6. tsc et lint propres.
- **R7 faite (22/11/2026, nuit)** : `paginateColumns` (`src/lib/performance/columns.ts`) pose la pastille « Ensuite »
  au bas de la **dernière colonne qui porte du texte** (`c[1]?.length > 0 ? 1 : 0`), choisie après l'équilibrage :
  aucune section ne change de page ni de colonne ; repli A (page réduite si la colonne n'a pas la place), une colonne,
  pastille en absolu, barre du bas, demi-page et scan inchangés. Tests (`mode-louange-colonnes`) : un test pur (droite
  plus haute → `suivant` 1, `cols` identiques sans pastille ; droite vide → 0 ; une colonne → 0) et le test
  navigateur de la pastille étendu (deux colonnes : pastille dans la dernière, sous sa dernière section), plus un cas
  ZH (`一生爱你` puis `abba-pere`). Sept specs (colonnes, forscore, sections-uniques, demi-page, barre-titre,
  rappel-indice, usage-dimanche), cinq projets, `--workers=2 --trace off` : 928 passés, 31 échecs, 93 ignorés, 48 min.
  Les 31 échecs sont **rouges aussi sans R7** : `louange-barre-titre:142`, `:285` (« 段落 » présent depuis CL-1),
  `louange-demi-page:157` (enveloppe `display: contents` de `NomsTouchables`), `usage-dimanche:221`, `:238`, `:330`,
  `:339` (métronome passé au panneau MT-2, capo, corbeille) : diagnostic du conseil Fable, corrections de tests
  écrites mais **non commitées** (hors R7) ; `rappel-indice:178` (中文, téléphone : indice et pastille se recouvrent,
  rouge aussi sans le diff de R7). Captures triées par `regard` (FR et ZH, cinq projets) : placement juste partout.
  Les agents de `.claude/agents/` ne se sont pas chargés (session ouverte hors du dépôt) : `/tranche` et `regard`
  ont tourné en `general-purpose` au même modèle, chacun lisant sa fiche.
- **R8 faite en partie (22/11/2026)** (commit `d4298462`). Les douze tests reproduits d'abord (cinq projets,
  `--workers=2 --trace off`) : 48 cas rouges, `rappel-indice:178` vert. Dix **tests en retard**, alignés : (1)
  `dispositions-partition:752` (téléphone) et `:795` (ordinateur, tablette paysage, 1 440) : la marge range ses vignettes
  en grille souple, 3 + 2 dans la colonne de 320 px (CI-15, 15/11), le panneau du mode louange aussi dès 1 024 px (reste
  d'A5, CI-4) ; le test vérifie rangées pleines sauf la dernière, 3 + 2 en colonne, colonnes égales, libellés entiers
  sur deux lignes au plus ; cinq de front sous 1 024 px comme avant. (2) `louange-barre-titre:142` et `:285` : depuis
  CL-1 les Repères d'un scan viennent de `sections.json` seul (CI-3, « le cas scan sans `sections.json` n'existe plus »)
  ; le test simule le scan sans Repères en répondant aussi à `sections.json`. (3) `louange-demi-page:157` : le sélecteur
  `[data-col-page] > *` tombait sur l'enveloppe `display: contents` de `NomsTouchables` (boîte nulle,
  `spec-accords-louange.md`) ; il vise l'enfant de l'enveloppe. (4) `rappel-ordre-joue:423` : trait tracé barre montrée,
  relu barre cachée ; la page 2 passe alors en rangée unique (A12, CI-22, Timothée le 16/11) et remonte de 52 px avec
  son texte et son trait (le trait suit bien le texte) : le test remontre la barre avant de comparer. (5)
  `usage-dimanche:221` métronome dans le panneau (MT-2), `:238` capo dans la fenêtre de l'armure (RU-5, « Outils perd
  Tonalité et Capo »), `:330` et `:339` corbeille toujours affichée, vide (`data-vide`, décision du 17/11, `d60e7bf5`).
  Un **défaut du site, non corrigé** (arrêt sur ce point) : (6) `louange-coupure:172`, rotation au téléphone (9 cas) :
  couché (412 px de haut), « Couplet 1 » est plus haut que la page, `pagesUneColonne` réduit la page
  (`src/lib/performance/columns.ts:99`, échelle 0,82) et `PageTexte.tsx:78` compense la largeur (`100 / scale` %) :
  le texte se repose sur 870 px alors que la copie de mesure l'a mesuré à 715 px, écran et copie ne coupent plus les
  vers pareil. Corriger touche la mise à l'échelle des pages réduites (choix visuel) : retouche à part. (7)
  `rappel-indice:178` : **non reproduit** (vert au premier tour, au tour final, puis 6 sur 6 au téléphone, FR et 中文) ;
  rien changé. Vus en passant, **hors liste, non touchés** : `rappel-ordre-joue:449` et `:482` (annotations d'avant le
  lot, téléphone) rouges aussi seuls, trait 32 à 96 px sous le haut de sa section, probablement la même rangée unique
  (CI-22) ; `louange-barre-titre:142` au téléphone a perdu une fois sur deux tours chargés le bouton ♩ (节拍), 3 sur 3
  et 8 sur 8 verts seul. Tests : tour final des sept specs, cinq projets, 985 passés, 15 rouges (les 9 rotations, les 5
  voisins ci-dessus, le ♩ sous charge), 82 ignorés, 48 min ; puis chaque test corrigé trois fois de suite sur les cinq
  projets : 141 sur 141 (7 min). tsc propre (hors `.next/`). Pendant ce temps, deux commits de P2 (`f5339990`,
  `2fb6a2cc`), aucun de P1 : aucun rouge n'est apparu ni disparu avec eux. Note : le Playwright du dépôt (1.62.1)
  attend Chromium 1234, le conteneur a 1243 : lancé avec `PLAYWRIGHT_BROWSERS_PATH` vers un dossier de liens (rien
  installé). Agents non utilisés : diagnostic, alignements et passages faits dans la session (alignements courts).
- **R9 faite (22/11/2026)**. Rouge reproduit d'abord : `louange-coupure:172` (« … puis après A+ et après une
  rotation »), téléphone, 10 sur 10 rouges (écart −1). Cause confirmée : `PageTexte.tsx` élargissait le corps d'une
  page réduite (`width: 100 / scale %`), le texte se reposait plus large que la copie de mesure. Correction (une ligne
  retirée) : la page réduite garde sa largeur, seul le `transform: scale()` reste ; le texte se pose à la largeur où
  il a été mesuré (une page réduite laisse donc une bande vide à droite, au lieu d'un texte élargi qui se coupe
  ailleurs). La pagination ne dépend pas de cette largeur : relevé avant/après (sections par colonne et par page, FR
  et ZH, « Tout le chant » sans disposition, Repères, Scène, et « Chaque section une fois », échelles 0,8, 1 et 1,2,
  cinq projets, 120 relevés) : écart nul. Résultats : `louange-coupure:172` téléphone 30 sur 30 (`--repeat-each=3`) ;
  rotation couché puis debout, FR et ZH, cinq projets, copie et écran égaux (captures du téléphone regardées : aucune
  ligne coupée) ; `louange-coupure`, `mode-louange-colonnes`, `louange-demi-page`, `louange-sections-uniques`,
  `nettoyage-louange-pures`, cinq projets : 574 verts, 0 rouge, 58 ignorés par la spec (20 min). Voisins, **non
  tombés, non touchés** : `rappel-ordre-joue:449` et `:482` (téléphone) 5 rouges, 1 vert ; `louange-reglages:123`
  (Chiffres) 10 sur 10 rouges (bouton introuvable). tsc propre. Aucun agent.
- 22/11/2026, soir : **R4, défaut corrigé** (vidéo de Timothée, iPad, mode louange : « après avoir déplacé la fenêtre
  et qu'après je veux glisser pour voir les possibilités d'harmonie la fenêtre bouge là où mon doigt appuie »).
  Reproduit au toucher (CDP) : après un déplacement au doigt, les écouteurs du déplacement restaient posés, parce que
  le relâchement (`pointerup`, `pointercancel`) d'un doigt n'arrive pas jusqu'à `window` en remontée dans le mode
  louange (il y arrive à la souris, d'où les tests verts) ; le doigt suivant, posé dans le contenu, déplaçait donc la
  fenêtre. Correction (`HarmonieDuChant.tsx`, `tirer`) : écoute en capture, filtrée sur le pointeur du geste. Test
  ajouté dans `harmonie-fenetre-placement` (rouge avant : saut de 573 px) ; la spec entière sur cinq projets :
  42 passés, 18 ignorés, 1,8 min. Vérifié aussi, au doigt, la poignée de la feuille « Affichage » du mode louange :
  pas de défaut (test ajouté dans `louange-menus`, vert sans correction). Sur un vrai iPad : à revoir par Timothée.
- 22/11/2026, soir : **R10 faite** (session d'origine). Option `sansFormes` passée par la partition d'une setlist et
  par le mode louange : plus d'« Intro avec la fin du refrain », de « Tag » ni de carte de montée de ton dans la
  fenêtre Harmonie ; la page d'un chant inchangée. Tests : test pur ajouté (`harmonie-suggestions`), deux tests de
  `harmonie-setlist` remplacés par un test d'absence (la montée de ton ne s'applique plus depuis Harmonie) ; ces deux
  specs sur trois appareils : 63 passés ; `louange-harmonie`, `harmonie-volet-section`, `harmonie-appliquer` :
  168 passés, 1 échec (`louange-harmonie:133` ZH au téléphone, instable connu : 8 sur 8 seul). tsc propre.
