# Spec : corrections d'interface du 14/11 (lot CI)

**Statut : validée par Timothée le 14/11/2026 (« Validé, enregistre-la ») ; go pour A3, A4, A5 ; harmonisations sans
planche (« fait le sans la planche »). Décisions ci-dessous (§ Réponses de Timothée).**

## Demande (Timothée, 14/11/2026, ses mots)

> « je veux juste que ce soit bien et là c'est nul » ; « avant de commit laisse moi valider d'abord » ; après lecture
> de `docs/parcours-oeil-2026-11-14.md` : « Il faut tout corriger ».

Périmètre : **tout le relevé** `docs/parcours-oeil-2026-11-14.md` (constats A à P, gêne faible, R1 à R6), sauf :
- **lot CL** (`docs/spec-corrections-louange.md`) : page du scan 简谱 entière, un trait = un tracé, « Chiffres » en
  louange et sur le calque, accord touché selon « Idées d'harmonie » ;
- **zones gelées** (`docs/audit-ui-apple-design.md` § 2) : couleurs de `serviceColors.ts`, logo, couleurs des accords,
  du 简谱 et des sections, intérieur du calque 简谱, export PDF ;
- **déjà confiés à des sessions de code** (pilote, 14/11, « Essaye de lancer des sessions en parallèle ») : voir A0.

Notations. Dispositions : **tel** (412 px), **tabP** (810), **tabL** (1 080), **ordi** (1 280), **1440**. Projets
Playwright : `telephone`, `tablette`, `ordinateur`, plus `tablette-paysage` et `ordinateur-1440` pour une spec
inscrite dans `SPECS_GRAND_ECRAN`. Taille : S (un composant), M (plusieurs écrans ou un comportement). Lignes de code
lues sur `68c80f4`.

## Partie A : les défauts

### A0. Déjà en cours dans d'autres sessions (cités, pas recherchés ici)

| Défaut du relevé | Session |
|---|---|
| R3. « prévu le 24/12 » pour une setlist du 25/12 | **fait**, poussé et validé (`8fd096b7`) |
| R4. Paroles décalées d'un espace sous un accord en début de vers | **voulu** (Timothée, 14/11) : rien à faire |
| R1. Note longue qui éclate la rangée des ronds de la feuille de route | **fait** : note sous les ronds (`ea2bed47`) |
| G. Métronome introuvable à partir de 768 px pour un chant sans tempo | **fait** : ♩ dans la barre à toutes les tailles (`ea2bed47`) |
| F. Légende « Points : déjà joué… » sur le titre d'une section | **fait** : légende posée en bas (`ea2bed47`) |

Ce que la recherche de ce jour a trouvé, transmis tel quel (les sessions prouvent elles-mêmes) : R4,
`ChordLine.tsx:45-49` fait de `[E] Dans` un segment `{chord:"E", lyric:" "}` affiché brut (`:358-361`), 915 lignes
`[X] texte` dans `content/songs/` ; G, `PerformanceMode.tsx:2134` `onMetronome={telephone && tempoChantId ? …}` et
♩ caché au téléphone (`BarreHaut.tsx:110`, `cacheTel`) ; F, `IndiceRappel.tsx:30` `absolute left-0 top-full z-20`
sans place dans la pagination ; R3, `chantsJoues.ts` lit la date en chaîne sans `new Date` : la cause n'est pas là.

### A1. « Affichage » redécoupe la page du mode louange (tel, tabP)

- **Constat.** Feuille Affichage ouverte, la partition se repagine : l'Intro seule au-dessus de 380 px de blanc
  (tel), le curseur passe de 4 à 8 points (tabP, site réel).
- **Cause.** `src/components/performance/PerformanceMode.tsx:803-805` : sous 1 024 px (`placeMarge !== "colonne"`),
  `reserveB = Math.round(ecran.hauteur * 0.4)` et `zoneH = ecran.hauteur - reserveB` ; `zoneH` nourrit le budget de
  page (`:1052`), la hauteur du scan (`:1096`) et les dépendances de la pagination (`:1183`). Ouvrir la feuille
  refait donc toute la pagination sur 60 % de l'écran.
- **Correction.** `reserveB` vaut 0 : la feuille recouvre le bas de la page, comme Repères, sans repaginer. La réserve
  à droite de 320 px (≥ 1 024 px, colonne) ne change pas.
- **Test.** `tests/louange-reglages.spec.ts`, nouveau cas « Affichage ouvert ne repagine pas » : chant FR et scan
  中文, lire le compteur (`lireCompteur`) et le texte du premier bloc, ouvrir Affichage, attendre la feuille, mêmes
  valeurs ; fermer, mêmes valeurs. Trois appareils.
- **Taille.** S. Dans `PerformanceMode.tsx` (après CL).

### A2. Repères absents d'un scan 简谱 (mode louange)

- **Constat.** Au mode louange, un scan n'a ni bouton Repères ni repère en tête (site réel, ordi), alors que la
  setlist liste ses sections.
- **Cause.** `PerformanceMode.tsx:1961-1983` : `reperesTexte` ne prend que les blocs `kind === "section"` ;
  `reperesScan` exige `jianpuSections[slug].sections` (`sections.json`) **et** `pg.fit && pg.tranche`. Sans
  `sections.json` ou sans tranche, la liste est vide, `avecReperes` est faux (`:2700`) et le bouton disparaît
  (`BarreHaut.tsx:86`). **CL-1 retire toutes les tranches** : sans reprise, `reperesScan` sera vide pour tous les
  scans.
- **Correction.** Déjà prévue par CL-1 (« un repère mène à la page du scan qui porte sa section ») : `reperesScan`
  cherche la page du scan (`sec.page`) au lieu de la tranche. Reste ici, après CL-1 : un scan sans `sections.json`
  prend ses repères de la structure du `.cho` (`{start_of_…}` du chant), tous menant à la première page du scan.
- **Test.** `tests/louange-roles-jianpu.spec.ts` (ou `louange-menus`) : scan certifié 恒久恒久以前 et scan de deux
  pages 为我而来, bouton Repères présent, chaque repère mène à la page qui porte sa section ; un scan sans
  `sections.json` a aussi le bouton. Cinq projets.
- **Taille.** S. **À ne coder qu'après CL-1**, en relisant ce que CL-1 a fait de `reperesScan`.

### A3. Évènements : « Aucun évènement à venir » écrit deux fois (tabL, 1440)

- **Cause.** `src/app/evenements/CalendrierClient.tsx:129` (`upcoming.length === 0 && vide` dans la liste) et `:182`
  (`: vide` dans le volet de droite) : en deux volets, le même paragraphe est rendu dans chaque volet.
- **Correction.** En deux volets (`grand`), le volet de droite seul porte le message ; la liste n'affiche rien.
- **Test.** `tests/pages-en-grand-evenements.spec.ts` : planning simulé sans évènement,
  `getByText(/Aucun évènement à venir/)` compte 1, cinq projets.
- **Taille.** S.

### A4. Interface 中文 : le filtre des chants dit « FR / 中文 » (tous écrans)

- **Cause.** `src/app/songs/SongListClient.tsx:343-344` : « FR » et « 中文 » écrits en dur ; la setlist passe par
  `t("common.languages." + language)` (`SetlistDetailClient.tsx:2267`, `zh-CN.json:44` « 法语 »).
- **Correction.** Le filtre lit `common.languages.fr` et `common.languages.zh`, comme la setlist (abrégés si la clé
  courte existe, sinon à créer dans les deux fichiers de langue).
- **Test.** `tests/libelles-langues.spec.ts` : interface 中文, le filtre montre 法语 ; interface FR, inchangé.
- **Taille.** S.

### A5. Marge « Affichage » : vignettes « Classique » et « Couleurs par section » collées (ordi, tabL)

- **Cause.** `src/components/song/ChoixDisposition.tsx:51` : cinq vignettes `grid-cols-5 gap-0.5` (2 px) dans
  `min(25rem, 100vw − 34px)` ; « Couleurs par section » tient sur trois lignes.
- **Correction.** Espace de 8 px entre vignettes et libellé sur deux lignes au plus (`line-clamp-2`, taille du
  libellé inchangée, libellé court si la clé existe).
- **Test.** `tests/marge-affichage.spec.ts` : les boîtes des libellés ne se chevauchent pas et font au plus deux lignes,
  cinq projets.
- **Taille.** S.

### A6. Défauts dont la cause reste à mesurer (première étape de leur tranche)

Pour chacun, la tranche commence par une mesure dans le DOM (Playwright) qui prouve la cause par chemin et ligne,
l'écrit dans l'Avancement, puis corrige. Si la mesure montre un choix de design et non un bug, il passe en partie B.

| Défaut | Pistes lues | Test qui l'attrape |
|---|---|---|
| N. Fenêtre des idées d'harmonie coupée en bas (tabL) | `HarmonieDuChant.tsx:188-216` (Radix, `max-h` sur `--radix-popover-content-available-height`, contenu `overflow-y-auto` `:460`) ; le menu Setlist, borné, fait pareil (`MenuLouange.tsx:170`) | `louange-harmonie.spec.ts` : bas de la fenêtre ≤ hauteur de l'écran, dernière idée atteignable au défilement, `tablette-paysage` et `ordinateur-1440` |
| Panneau d'un accord qui dépasse du bas (ordi, déjà vu par CL) | `AccordsProvider.tsx:455-476` (`fixed`, `hauteurMax ?? innerHeight − 2·MARGE`) ; `placer` non lu | `louange-accords.spec.ts` : « Voir tout le dictionnaire » visible dans l'écran, ordinateur |
| M. Setlist à 1 440 px marge ouverte : deux colonnes de 355 px, vers coupés | `PartitionView.tsx:332` (`@container partition` ≥ 1 000 px → `columns-2`) ; le code donne 448 px au moins : le 355 px vient d'ailleurs | `marge-affichage.spec.ts` (setlist) : à 1 440 px marge ouverte, une colonne si chaque colonne ferait < 420 px |
| Sombre : « Affichage » gris clair sur gris (setlist, tel) ; onglets Musiciens / Back-Office gris sur gris | non trouvé (`SelecteurEspace.tsx` à lire) | contraste ≥ 4,5:1 mesuré sur ces trois éléments en thème sombre |
| Paroles chinoises : trous entre caractères (« 世 上 的一 切 ») | `SongView.tsx:224-275` (`ZhLine`, une colonne par caractère, largeur à mesurer) ; 13/11 constat 12 ter | `accords-voisins-zh.spec.ts` (ou nouveau) : écart entre deux caractères voisins sans accord ≤ 0,1 em, page chant et mode louange |
| Équipes : l'ordre change selon la taille | tri `referentsDabord` (`EquipesClient.tsx:311`) ; `columns-3` (`:332`, `:381`) remplit par colonne : l'ordre de lecture change avec le nombre de colonnes | `equipes-agencement.spec.ts` : même ordre des noms d'équipe aux cinq projets |
| Harmonie : puces de filtre coupées au bord droit (tabL) | `Catalogue.tsx:162` `flex-wrap`, mais `Onglets.tsx:217-223` défile en largeur au toucher | `harmonie-catalogue.spec.ts` : dernière puce entièrement visible ou défilement annoncé, `tablette-paysage` |

### A7 à A9. Défauts vus le 14/11 au soir (agent-desktop, branche à `63704672`, ordi 1 366 px, setlist de deux chants)

Relayés par le pilote ; numérotés A7 à A9 ici (A6 est déjà le tableau ci-dessus).

- **A7. La barre du haut recouvre le haut d'une page de texte** (mode louange). Page 2 d'un chant, section seule en
  haut : bordure du cadre et moitié du titre de section coupées (≈ 10 px) ; même chose pour la rangée du rappel.
  Cause située dans la mise en page de `PerformanceMode.tsx`, non prouvée à la ligne : la tranche la prouve d'abord.
  Test : haut du premier élément de la page ≥ bas de la barre ouverte, pages 1 et 2, cinq projets. **Après CL-1**
  (même fichier). S.
- **A8. Menu Outils (clé) du mode louange.** Retoucher la clé le ferme puis le rouvre au lieu de le fermer ; les
  flèches du clavier ne tournent pas la page tant qu'il est ouvert. Test : `louange-menus.spec.ts`, deux touches sur
  la clé → menu fermé ; menu ouvert, → tourne la page (ou ferme le menu puis tourne : à fixer avec B1). S.
- **A9. « Idées d'harmonie » ramène à la 1ʳᵉ page d'un chant 简谱.** Depuis la 2ᵉ page d'écran, allumer ou éteindre
  le réglage réancre sur la première page qui contient le bloc (`pageAncree`, repagination sur `ideesActives`,
  `PerformanceMode.tsx` ≈ `:1112` et `:1187`). Devrait disparaître avec CL-1 (une page du scan = un bloc) :
  **revérifier après CL-1**, corriger seulement s'il reste. Test : `louange-harmonie.spec.ts`, page 2 d'un scan de
  deux pages, bascule du réglage, même page.

R2 (repères d'un scan) est A2 ; R5 (barre selon les droits) et R6 (couleur du bouton) sont en partie B.

## Partie B : les harmonisations (sans planche)

Timothée, 14/11 : « fait le sans la planche ». La règle marquée **retenue** est une décision déléguée (pilote, 14/11),
prise sur la proposition motivée de cette spec ; les autres pistes restent pour mémoire. Zones gelées inchangées.
Chaque tranche finit par le regard sur l'écran réel et la validation de Timothée (§ Tranches).

### Groupe 1 : les feuilles et menus du mode louange (tel, tabP, tabL, ordi)

**B1. Fermeture des feuilles et menus** (relevé A).
- Diffère : `MenuLouange.tsx:141` (Repères, Outils) titre centré, sans × ; Setlist (`PerformanceMode.tsx:2723`) titre
  caché et nom de la setlist à gauche (`ContenusMenus.tsx:200`) ; Affichage (`MargeAffichage.tsx:169-178`) et
  Métronome (`PanneauMetronome.tsx:178`) titre à gauche et × écrit à la main ; Idées d'harmonie : `DrawerHeader` et
  `Croix` (`HarmonieDuChant.tsx:130-175`), seul usage de `ui/drawer.tsx` ; Crayon : « Terminé » en haut
  (`BarreAnnotation.tsx:204-211`) et ✓ en bas, qui n'est qu'un témoin d'enregistrement (`:214-218`) mais se lit comme
  une sortie. Aucun en-tête commun dans `src/components/ui/`.
- Règle : **(a) retenue** : un en-tête unique `EnTeteFeuille` (titre à gauche, × à droite, 44 px), porté par
  `MenuLouange` et utilisé par les sept ; une seule sortie visible ; le ✓ du Crayon devient un mot discret
  (« Enregistré ») qui ne ressemble pas à un bouton. (b) Pas de × : on ferme en touchant dehors ou en glissant, titre
  à gauche partout (plus épuré, moins découvrable). (c) × seulement sur les feuilles du bas (tel, tabP), rien sur les
  bulles d'ordinateur.

**B2. Menu Outils : deux styles de ligne, doublons** (relevé B).
- Diffère : lignes à rond 44 px (`BoutonRond`, `ContenusMenus.tsx` : Transitions, Plein écran, Métronome visuel
  `:382`, Annotations `:387`, Idées `:394`) sans libellé d'état ; lignes à icône Crayon (`:404`) et Métronome
  (`:416`) au téléphone seulement (`PerformanceMode.tsx:2132-2134`). « Annotations » (montrer) et « Crayon »
  (dessiner), « Métronome visuel » (réglage) et « Métronome » (feuille) se lisent comme des doublons ; « Métronome
  visuel » est un rond ici et un interrupteur dans la feuille Métronome.
- Règle : **(a) retenue** : deux groupes titrés, « Réglages » en interrupteurs (`ui/switch`, comme Affichage) et
  « Actions » en lignes à icône et chevron ; renommer « Annotations » → « Voir mes annotations » et retirer
  « Métronome visuel » d'Outils (il reste dans la feuille Métronome, ouverte par la ligne « Métronome »). (b) Tout en
  interrupteurs, actions à part dans la barre. (c) Garder les ronds en ajoutant « Allumé / Éteint » sous chacun.
- Dépend de G (A0) : la ligne « Métronome » à toutes les tailles.

**B3. Tonalité et titre** (relevé D, R site réel).
- Diffère : carré `Armure.tsx:57-70` dans la barre (`BarreHaut.tsx:105`) ; barre cachée, titre « ❶ ABBA PÈRE » et
  rond bleu (`PerformanceMode.tsx:260-275`, `:315-330`) puis tonalité flottante au coin (`:2404-2413`, 4 px du bord) ;
  scan : pastille « 1=E » (`PageScan.tsx:85-100`) ou « 1 = E » de la tête de feuille (`TeteFeuille.tsx:136`) ; « ·
  D » gris dans « Ensuite » (`:2074-2090`).
- Règle : **(a) retenue** : le carré `Armure` partout où une tonalité s'affiche seule (barre, coin, en-tête),
  à 24 px des bords ; titre en casse normale ; sur un scan, pas de pastille quand l'image imprime déjà « 1 = X »
  (sauf transposition : alors le carré, à côté et non dessus) ; « Ensuite : 谢谢你 » suivi du même carré en petit.
  (b) Pas de tonalité quand la barre est cachée (le titre seul).

**B4. Repères : ronds sur les paroles, autre forme sur un scan** (relevé E).
- Diffère : ronds 44 px (`SongView.tsx:690-712`) ; tête de feuille d'un scan certifié, pastilles de 24 px
  (`TeteFeuille.tsx:104-109`) ; rond de 20 px numéroté (`PageScan.tsx:74-77`). Couleurs gelées (forme seulement).
- Règle : **(a) retenue** : les ronds 44 px (32 au tel) en tête de chaque page, scan compris ; la tête de feuille
  garde son contenu mais prend les mêmes ronds. (b) Garder la tête compacte du scan (elle ne prend pas de hauteur
  à l'image), avec les ronds en 32 px.

**B4 bis. Panneau d'un accord** (constat de design du 14/11 au soir, relayé par le pilote). À l'ordinateur, le panneau ouvert sur un
accord du bord gauche recouvre l'accord touché et toute la colonne de gauche. Règle : **(a) retenue** : le
panneau s'ouvre du côté opposé à l'accord et ne couvre jamais l'accord touché. (b) Feuille du bas à toutes les
tailles.

### Groupe 2 : les commandes de lecture partagées (page chant, setlist, louange ; cinq dispositions)

**B5. La marge « Affichage » : trois formes** (relevé H, 3).
- Diffère : `MargeAffichage.tsx:19-26` décide sur la **fenêtre** (`matchMedia`) : colonne ≥ 1 024 px et zone ≥ 684 px
  (`useZoneAssezLarge(320+24+340)`, `SongDetailClient.tsx:250`, `SetlistDetailClient.tsx:1161`) ; sinon feuille
  large flottante de 560 px centrée (≥ 768 px, `:151`) ; sinon feuille du bas `40dvh` (`:150`). Le relevé décrit une
  feuille à poignée coupée dans la carte (page chant, ordi) que le code de ce jour ne montre pas (pas de poignée hors
  louange) : la tranche part d'une capture à jour.
- Règle : **(a) retenue** : deux formes seulement, panneau latéral de 320 px quand la zone le permet, feuille du
  bas pleine largeur sinon (la feuille flottante centrée disparaît) ; le mode louange suit la même règle (après A1).
  (b) Feuille du bas partout (une seule forme, moins de place pour lire au grand écran).

**B6. Accords, Pinyin, Affichage : trois formes du bouton, plus un doublon** (relevé I, 5).
- Diffère : page chant, `SongDetailClient.tsx:585-620` avec `globals.css:779-790` (libellé visible si rangée
  ≥ 620 px, et pour Affichage si fenêtre ≥ 768 px) : rond à icône seule (tel ; chant 中文 à l'ordi, où le 拼 prend la
  place) ou pastille étiquetée ; setlist, `SetlistDetailClient.tsx:2325-2345` (`PILULE_EMPILEE`, `LIBELLE_COURT`) :
  icône au-dessus du mot à 11 px sous 1 024 px. L'interrupteur « Accords » de la marge double le bouton.
- Règle : **(a) retenue** : une forme par disposition, la même partout : tel = ronds à icône seule avec libellé
  accessible ; dès 768 px = pastilles étiquetées ; la place se libère en repliant d'abord dans ⋯ (B7), jamais en
  changeant de forme selon la langue du chant. L'interrupteur « Accords » quitte la marge. (b) Pastilles
  icône-au-dessus-du-mot partout sous 1 024 px.

**B7. Barre d'une setlist selon droits et taille** (relevé L, R5).
- Diffère : `SetlistDetailClient.tsx` : Modifier (`canEdit`, `:2151`), Dupliquer pour mes notes
  (`!canEdit && canDuplicate`, `:2158-2161`), PDF (`peutPdf`, `:2164`) dans la barre ou le ⋯ (`:2419`, `:2428`) selon
  la taille ; Crayon `!horsLigne` (`:2345`), Liste/Partitions `compacte` (`:2381`). Titre tronqué en tabP ; segment
  Liste/Partitions de 20 px au tel.
- Règle : **(a) retenue** : ordre fixe Affichage · Accords · Crayon · [action de droits : Modifier **ou**
  Dupliquer, à la même place] · Mode Louange · ⋯ ; PDF et le reste toujours dans ⋯ ; les derniers se replient dans ⋯
  quand la place manque, jamais le titre (deux lignes au tel plutôt que tronqué). (b) Actions de droits toujours
  dans ⋯ (barre identique pour tous, une touche de plus pour l'admin).

**B8. Bouton « Mode Louange »** (relevé K, R6).
- Couleur : `SetlistDetailClient.tsx:2391` `serviceButtonFill(categoryColor(setlist.category))` : couleur du
  service, `serviceColors.ts` est **gelé**. Voulu : on ne la change pas.
- Libellé : « Mode Louange » (`libelle-outil`, ≥ 1 024 px), « Louange » sous l'icône (`LIBELLE_COURT`), rond ▶ sous
  640 px (`:2391-2396`). Règle : **(a) retenue** : « Louange » avec ▶ partout où la place le permet, rond ▶
  au tel (cohérent avec B6). (b) « Mode Louange » partout, quitte à replier un bouton de plus dans ⋯.

**B9. Aide « Touche un accord »** (relevé J).
- Diffère : bulle noire « OK » sur la page chant (`AccordsProvider.tsx:484-539`, posée sur les paroles, reste devant
  le menu ⋯) ; bandeau gris × dans la setlist (`:551-575`, `PartitionView.tsx:219`). Même clé `accords-aide-vue`
  (`:125`).
- Règle : **(a) retenue** : le bandeau de la setlist sur la page chant aussi, au-dessus du chant, × à droite ;
  la bulle disparaît. (b) Garder la bulle, la fermer à l'ouverture de tout menu.

**B10. Retours** (gêne faible).
- Diffère : `EnTetePage.tsx:23-30` « ‹ Section » en texte (création, équipes, guide, `DetailService.tsx:93`) ; flèche
  ronde ← sans mot (page chant et setlist au tel) ; « ← Retour » à 1 100 px ; rien sur une setlist en tabL et ordi.
- Règle : **(a) retenue** : `Retour` de `EnTetePage` partout (« ‹ Setlists », « ‹ Chants »), y compris page chant
  et setlist, à toutes les tailles où il n'y a pas de deux volets. (b) Flèche seule partout, mot en libellé accessible.

### Groupe 3 : états actifs et grilles (tout le site)

**B11. États actifs** (relevé O).
- Diffère : pastille blanche sur gris (Tous / FR / 中文, À venir / Archives, Équipes / Musiciens), fond noir
  (Lettres / Chiffres, Guitare / Piano, `SectionTabs.tsx:160`), puces noires (Planning), coche sur gris (rôle,
  « Mes setlists ») ; pilules de `Onglets.tsx:168-217` et pilules propres de `Bibliotheque.tsx:36`. Aucun segment
  commun dans `src/components/ui/`.
- Règle : **(a) retenue** : deux composants, écrits une fois dans `ui/` : `Segment` (choix d'une vue : pastille
  blanche sur gris) et `Bascule` (réglage : fond noir) ; les coches restent pour une liste à choix multiple. (b) Un
  seul style (pastille blanche) pour tout.

**B12. Équipes : grille** (relevé P ; l'ordre est en A6).
- Règle : **(a) retenue** : grille qui passe à la ligne, colonnes de 280 px au moins, plus de bandeau
  horizontal à fondu (`BandeauEquipes.tsx:286-320`). (b) Garder le bandeau, avec flèches visibles.

**B13. Finitions de mise en page** (gêne faible), règle commune : rien ne colle au bord d'une page de lecture
plafonnée à 1 440 px ; une même rangée a un seul bord droit.
- Moi : trou sous « Mes services », « Réglages » qui change de place (`moi/page.tsx:130`, `:162-163`, colonnes de
  hauteurs inégales : à mesurer).
- Setlists à 1 440 px : « Ouvrir » et « Mode Louange » au bord droit, loin de la carte de 414 px.
- Liste des chants (tabP) : index A–Z, carte et « Proposer un chant », trois bords droits.
- Rail de la tablette paysage (`BarreLaterale.tsx:278`, `SelecteurEspace.tsx:168`) : libellés sous les icônes, un
  seul élément actif, langue et thème présents comme aux autres tailles.

## Tranches et ordre

Une tranche = un commit, après validation de Timothée. **Touche `PerformanceMode.tsx` = oui** : après CL-1 (non
commitée le 14/11 au soir), une seule à la fois dans ce fichier. Les tranches qui partagent `SongDetailClient.tsx` ou
`SetlistDetailClient.tsx` (CI-11 à CI-14) passent aussi une à la fois.

| Tranche | Corrige | Fichiers | `PerformanceMode` | Spec |
|---|---|---|---|---|
| CI-1 | A3, A4, A5 (go du 14/11) | `CalendrierClient.tsx`, `SongListClient.tsx`, `locales/fr.json`, `locales/zh-CN.json`, `ChoixDisposition.tsx` | non | A3, A4, A5 |
| CI-2 | A1, Affichage ne repagine plus | `PerformanceMode.tsx` | oui | A1 |
| CI-3 | A2, repères d'un scan | `PerformanceMode.tsx` | oui | A2 |
| CI-4 | A7, A8, puis A9 s'il reste | `PerformanceMode.tsx`, `MenuLouange.tsx`, `BarreHaut.tsx` | oui | A7 à A9 |
| CI-5 | A6, un défaut à la fois (mesure puis correction) | `HarmonieDuChant.tsx`, `AccordsProvider.tsx`, `PartitionView.tsx`, `SelecteurEspace.tsx`, `SongView.tsx` (`ZhLine`), `EquipesClient.tsx`, `Onglets.tsx` selon la mesure | non | A6 |
| CI-6 | Panneau d'accord sans accès Harmonie | `PerformanceMode.tsx`, `ContenusMenus.tsx`, `AccordsProvider.tsx` | oui | Réponses, 2 |
| CI-7 | B1, une fermeture pour toutes les feuilles | `ui/` (nouvel `EnTeteFeuille`), `MenuLouange.tsx`, `ContenusMenus.tsx`, `MargeAffichage.tsx`, `PanneauMetronome.tsx`, `BarreAnnotation.tsx`, `HarmonieDuChant.tsx`, `PerformanceMode.tsx` | oui | B1 |
| CI-8 | B2, Outils en réglages et actions | `ContenusMenus.tsx`, `PanneauMetronome.tsx`, `PerformanceMode.tsx`, locales | oui | B2 |
| CI-9 | B3, tonalité et titre d'une seule forme | `PerformanceMode.tsx`, `Armure.tsx`, `PageScan.tsx`, `TeteFeuille.tsx` | oui | B3 |
| CI-10 | B4, mêmes ronds de repères partout | `SongView.tsx`, `TeteFeuille.tsx`, `PageScan.tsx` | non | B4 |
| CI-11 | B5, B6 : marge et boutons de lecture | `MargeAffichage.tsx`, `SongDetailClient.tsx`, `SetlistDetailClient.tsx`, `globals.css` | non | B5, B6 |
| CI-12 | B7, B8 : barre de setlist ordonnée | `SetlistDetailClient.tsx`, locales | non | B7, B8 |
| CI-13 | B9, B4 bis : aide et panneau d'accord | `AccordsProvider.tsx`, `PartitionView.tsx`, `SongDetailClient.tsx` | non | B9, B4 bis |
| CI-14 | B10, un seul « Retour » partout | `EnTetePage.tsx`, `SongDetailClient.tsx`, `SetlistDetailClient.tsx` | non | B10 |
| CI-15 | B11, deux composants d'état actif | `ui/` (`Segment`, `Bascule`), `Onglets.tsx`, `SectionTabs.tsx`, `Bibliotheque.tsx`, `SongListClient.tsx`, `MargeAffichage.tsx` | non | B11 |
| CI-16 | B12, équipes en grille à ordre fixe | `EquipesClient.tsx`, `BandeauEquipes.tsx` | non | B12, A6 (ordre) |
| CI-17 | B13, finitions de mise en page | `moi/page.tsx`, liste des setlists, `SongListClient.tsx`, `BarreLaterale.tsx`, `SelecteurEspace.tsx` | non | B13 |

Tests : ceux de la section de chaque défaut ou harmonisation ; agencement dans `SPECS_GRAND_ECRAN` (cinq projets) ;
parcours du culte pour toute tranche à « oui ». CI-1, CI-5 et CI-10 à CI-17 ne touchent pas le mode louange
(sauf `AccordsProvider.tsx`, partagé : CI-5, CI-6 et CI-13 une à la fois).

**Fin de chaque tranche, dans cet ordre.**
1. Tests de la tranche sur les trois appareils (cinq projets pour l'agencement), et le parcours du culte si elle
   touche le mode louange.
2. Regard sur l'écran réel, recette ci-dessous.
3. Diff et captures envoyés à Timothée ; **commit seulement sur son « validé »**, puis push.

**Recette du regard sur l'écran réel (agent-desktop, d'après le § Vérification du relevé).**
1. Bureau virtuel Xvfb et Chromium piloté par agent-desktop.
2. Le site de la branche : `next dev` local (le site en ligne n'a que `main`) ; après mise en ligne, le site en
   ligne avec le compte invité.
3. Compte invité ou compte simulé, **lecture seule** : rien créer, modifier ni annoter dans le compte invité, partagé ;
   « Je joue » non touché.
4. Fenêtres : 1 366 px (ordi), plein écran sur 1 440 px, 830 px (tabP), 1 100 px (tabL).
5. Le téléphone ne se voit pas par agent-desktop (une fenêtre ne descend pas sous 500 px environ) : pour lui,
   captures Playwright `telephone` à `deviceScaleFactor: 1`.
6. Contenus : une setlist de quatre chants (FR, 中文 en paroles, scan 简谱, FR à feuille de route annotée), une setlist
   d'un chant FR et d'un scan.
7. Refaire le geste du défaut corrigé à chaque fenêtre, avant et après.
8. Captures hors dépôt si elles montrent de vrais noms.
9. Verdict écrit par défaut : corrigé, différent, non vu, avec la disposition.
10. Le verdict va dans l'Avancement avant la demande de validation.

## Test « parcours du culte »

Nouveau `tests/louange-parcours-culte.spec.ts`, rejoué après chaque tranche qui touche le mode louange, trois
appareils plus `tablette-paysage` (dans `SPECS_GRAND_ECRAN`). Session simulée (`tests/helpers/fakeSession.ts`,
`tests/helpers/louange.ts`), une musicienne fictive, setlist FR `abba-pere`, 中文 `谢谢你`, scan `一生爱你`, FR
`a-jamais-tu-es-saint`.
1. Ouvrir le mode louange depuis la setlist : première page, titre et tonalité visibles.
2. Tourner la page : touche au bord, balayage, flèche du clavier ; le compteur avance d'un à chaque fois et revient.
3. Aller au scan par Repères (A2) ; annoter : Crayon, un trait, « Terminé » ; un seul tracé, là où il est dessiné
   (CL-2) ; il reste après rechargement.
4. Affichage : passer en « Chiffres » ; les accords du texte et du calque changent (CL-3) ; la pagination ne bouge
   pas (A1) ; fermer.
5. « Idées d'harmonie » allumé : toucher un accord au bord gauche, son panneau s'ouvre et la page ne tourne pas
   (CL-4) ; le fermer.
6. Ouvrir puis fermer chaque menu et feuille (Setlist, Repères, Outils, Affichage, Métronome, Crayon, Idées) par
   sa sortie visible et par Échap ou le toucher dehors ; après chaque fermeture, aucun dialogue ouvert et la page
   n'a pas changé.
7. Aucune erreur dans la console sur tout le parcours.

## Réponses de Timothée (14/11/2026, vers 22 h 20 UTC, relayées par le pilote)

1. Petits défauts hors mode louange (A3, A4, A5) : « Les trois » → **go** (CI-1).
2. Comptes sans accès Harmonie en mode louange : « Ouvrir le panneau de l'accord » : ils voient comment jouer
   l'accord (doigté guitare et piano), sans les idées d'harmonie ; le réglage apparaît pour tout le monde. Complément
   de CL-4, après CL-1 (CI-6).
3. Planches des harmonisations : « fait le sans la planche ». Les règles **retenues** de la partie B sont des
   décisions déléguées (pilote, 14/11).
4. Spec : « Validé, enregistre-la ».

Décisions déléguées (pilote, 14/11), sur les propositions de cette spec : ordre, CI-1 d'abord puis le reste après
CL-1 ; A1, la feuille recouvre le bas de la page ; B1, un × en haut à droite partout, une seule sortie.

## Tests déjà rouges avant ces lots

À traiter à part ; aucun n'a été sauté : `usage-dimanche:221` (métronome), `usage-dimanche:238` (capo),
`usage-reste:147` (couleur d'accords), `coup-d-oeil:215` ×3 (libellé « Chaque section une fois »),
`louange-sections-uniques:615` en tablette, `louange-barre-titre` « fr, dark, ×1.25 » au téléphone (le toucher au
centre tombe sur un accord).

## Avancement

- 14/11/2026 : spec écrite (trois recherches de causes en Haiku), ni commitée ni poussée, envoyée à Timothée pour
  validation. A0 confié par le pilote à deux sessions de code.
- 14/11/2026, 22 h 15 UTC (relayé par le pilote) : poussés et validés par Timothée dans leurs sessions : CL-3
  (`6184738`), CL-4 (`63704672`), R3 (`8fd096b7`), R1, G et F (`ea2bed47`). R4 voulu. CL-1 et CL-2 en cours, non
  commitées. Ajouts : A7 à A9, B4 bis, tests déjà rouges.
- 14/11/2026, vers 22 h 20 UTC : réponses de Timothée (ci-dessus), spec validée et commitée ; tranches CI-1 à CI-17.
