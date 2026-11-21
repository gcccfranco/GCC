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
