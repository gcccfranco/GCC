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
  Décision déléguée (session CI-14, 15/11) : option (b) (flèche seule, mot en libellé accessible) dans la barre de la
  setlist en deux cas seulement : vue Partitions sous 640 px, parce que RU-4 (Affichage partout, Accords à un toucher
  dès 360 px) n'y laisse pas les 29 px du mot ; vue Liste sous 360 px, où le mot ferait passer la barre sur deux
  lignes. Depuis un chant ouvert d'une setlist, le retour dit « ‹ Setlists » (la section, R8), pas le titre.

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

**B14. Signe de défilement des fenêtres bornées** (venu d'A6 par la mesure de CI-5, 15/11 ; pas de règle retenue,
pas de tranche). La fenêtre des idées d'harmonie (mode louange) et le panneau d'un accord **tiennent dans l'écran** à
toutes les tailles mesurées : bas de la fenêtre à 792 px pour 810 en tabL et à 882 px pour 900 à 1 440 px
(`HarmonieDuChant.tsx:200`, `max-h` sur `--radix-popover-content-available-height`) ; panneau d'un accord à 8 px du
bas au plus, à 1 280 × 720, 1 366 × 620 et 1 440 × 900, « Ensuite » ouvert compris (`AccordsProvider.tsx:386-407`,
`hauteurMax`). Le contenu défile en dedans (3 828 px pour 540 visibles) : la liste « s'arrête au milieu d'une idée,
sans signe de défilement », et « Voir tout le dictionnaire » passe sous le bord quand « Ensuite » est ouvert. Ce n'est
pas un débordement, c'est l'absence de signe. Proposition : un fondu en bas tant qu'il reste une suite, comme le
volet de la bibliothèque (`.fondu-vertical`, `useFonduVertical`) ; à trancher, puis une tranche (fichiers de la chaîne
« lecture » et de CI-7).

**B15. Paroles chinoises : écart entre caractères** (venu d'A6 par la mesure de CI-5, 15/11 ; pas de règle retenue,
pas de tranche). Mesure (谢谢你, page chant, ordinateur) : 59 paires de caractères voisins sur 94 ont plus de
0,4 em d'écart (de 0,4 à 1,35 em). Chaque caractère est une colonne de 1,6 em au moins (`SongView.tsx:398`), qui
s'élargit à son accord, centré au-dessus (`:452-469`, marge de 0,25 em de chaque côté) et à sa syllabe de pinyin
(`:487-495`, « shàng », « yòng ») : deux règles écrites et voulues (accords longs qui se touchaient, 26/09 ; syllabes
larges). Causes mesurées : l'accord dans la plupart des paires (« 的爱 » 1,17 em, « 得来 » 1,35 em), le pinyin pour les
autres (« 世上 », « 能用 »). Pistes : (a) l'accord déborde au-dessus des voisins sans accord et ne réserve sa
largeur qu'avant l'accord suivant (comme en français) ; (b) le pinyin déborde de 0,15 em au plus avant d'élargir ;
(c) ne rien changer. À trancher, puis une tranche (`SongView.tsx`, après CI-10).

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
- 14/11/2026, vers 23 h UTC : **CI-1 faite** (A3, A4, A5), validée par Timothée (« validé »). A3 corrigé en deux volets (tabL, ordi, 1 440) ; A4 corrigé partout (clés `common.languagesShort`) ; A5 : écart de 8 px et libellé borné à deux lignes dans la marge, visible au téléphone, à peine ailleurs (trois lignes non reproduites). Décision déléguée (session CI-1, 14/11) : `ChoixMenu` du mode louange non touché (test de taille de miniatures en cours chez CL-1). Tests : trois specs touchées et `evenements-2027`, cinq projets, 382 passés, 0 échec, ≈ 11 min. Regard : captures Playwright avant / après aux cinq tailles (artefact privé) ; **pas vu à l'écran réel**, l'installation d'agent-desktop ayant été refusée dans la session.

- **CI-11 (B5, B6), 15/11/2026, validée par Timothée (« Validé »).** Marge « Affichage » : deux formes (colonne de
  320 px dès 1 024 px ; sinon feuille du bas pleine largeur, ou largeur du volet du chant en deux volets, réglages
  centrés sur 560 px). Boutons Accords, Pinyin, Affichage, Crayon (`BOUTON_LECTURE`) : ronds à icône seule sous
  768 px, icône + mot dès 768 px, page chant et setlist, FR et 中文. Interrupteur Accords retiré de la marge en page
  (gardé en louange). Décisions déléguées (session CI-11, 15/11) : le Crayon de la page chant prend son mot comme
  celui de la setlist (B6) ; l'interrupteur Pinyin reste dans la marge (la setlist n'a pas de bouton Pinyin), question
  posée à Timothée. Tests : marge-affichage, page-chant-reglages, barre-chant, ma-partition-crayon (188 verts, 6,5 min,
  cinq projets) ; setlist-tonalite-perso, setlist-g, setlist-deux-volets, paroles-sans-accords verts ; rouges déjà sur
  l'ancien code : `jianpu-par-defaut:260`, `louange-reglages:101` ×2 ; instables, verts seuls (3/3 et 6/6) :
  `setlist-tonalite-perso:125` (ordinateur), `barre-chant:173` (ordinateur-1440). Regard : captures Playwright aux
  cinq largeurs, **non vu à l'écran réel** (installation d'agent-desktop refusée). Verdict : page chant corrigée
  partout ; setlist corrigée au téléphone, à 1 366 et 1 440 px, différente à 830 et 1 100 px (titre coupé par les
  pastilles plus larges, à régler en CI-12 par le repli dans ⋯). Relevés hors tranche : en-tête de setlist à deux
  volets, Accords dans ⋯ (CI-12) ; même noir pour « activé » et « ouvert » au téléphone ; barre pas recalée quand la
  colonne est ouverte à 1 100 px.
- 15/11/2026, vers 6 h UTC : **CI-17 faite** (B13), validée par Timothée (« validé »). Moi : réglages et déconnexion sous le compte dès la tablette portrait ; aperçus en une colonne à toutes les tailles (plus de trou sous « Mes services »). Setlists : seule, la carte des chants prend toute la rangée, les boutons finissent à son bord droit (tabL, ordi, 1 440). Chants (tabP) : index A–Z dans la carte, « Proposer un chant » au bord de la carte. Rail réduit (tabL et ordi replié) : nom sous chaque icône, un seul élément actif, langue et thème au pied. Décisions déléguées (session CI-17, 14-15/11) : tabP prend l'agencement du grand écran pour Moi ; une colonne d'aperçus partout (les colonnes CSS laissaient 190 px de vide à 1 440) ; langue et thème d'un membre dans le rail (Q5 révisé) ; libellés du rail sur deux lignes au plus, sans césure ; téléphone inchangé (index A–Z hors carte). `globals.css` non touché (classes Tailwind dans les TSX). Tests : huit specs (moi, setlists, pages-en-grand-setlists, chants, t2a, songs-index, barre-reduite, back-office-espace), cinq projets, tout vert au dernier tour (646 passés, puis reprises ciblées), ≈ 20 min ; `agencement-barre-reduite:93` (setlist, barre dépliée, 1 440) a échoué une fois puis est passé : instable. Regard : captures Playwright avant / après aux cinq tailles (artefact privé), un `critique-design`, une reprise ; **pas vu à l'écran réel** (installation d'agent-desktop refusée).
- 15/11/2026, vers 8 h UTC : **CI-15 faite** (B11, règle (a), et reste d'A5), validée par Timothée (« validé »). Deux composants dans `src/components/ui/` : `Segment` (choisir une vue : rail gris, pastille blanche ; code d'`OngletsRail` déplacé, `OngletsRail` gardé en alias) et `Bascule` (un réglage : fond noir ; ancien `Segment` de la marge, gardé en alias pour `PanneauMetronome`). Bibliothèque de l'éditeur : Tous · FR · 中文 en `Segment` comme la liste des chants ; plannings au téléphone et en tablette portrait : rail gris, pastille blanche, nom à la couleur du service ; « Je joue » de la marge en `Bascule` ; actif des `Pilules` et de « Moins joués » pris de `BASCULE_ACTIVE`. A5 : vignettes de disposition de la marge en grille souple (3 + 2 dans la colonne de 320 px, aperçus de 64 px), libellés entiers en FR et 中文 ; le panneau du mode louange n'est pas touché (prop `souple`, passée par la marge seule). Décisions déléguées (session CI-15, 15/11) : les vignettes de disposition gardent leur anneau bleu (des aperçus, ni vue ni réglage, composant partagé avec le mode louange) ; les plannings du grand écran restent des pilules de service. Tests adaptés (ancien agencement) : filtre de langue de la bibliothèque (`tab`, `aria-selected`), hauteur des onglets de planning au toucher (34 px dessinés, 44 px de zone), grille des vignettes dans `marge-affichage` ; trois tests neufs. Tests : onze specs, 859 verts (17,5 min), puis 280 verts après la reprise (bibliothèque, harmonie, marge ; 5 min). Regard : captures Playwright avant / après aux cinq tailles (artefact privé), un `critique-design`, une reprise (rail écrasé au téléphone, vignettes trop grandes) ; **non vu à l'écran réel** (installation d'agent-desktop refusée). Reste vu hors tranche : le choix 简谱 / 歌词 de la page chant garde un fond noir alors que c'est une vue.
- 15/11/2026, vers 8 h 20 UTC : **CI-16 faite** (B12, règle (a), et l'ordre d'A6), validée par Timothée (« Validé »). Mesure : l'ordre de lecture des équipes (haut puis gauche) donnait cinq ordres différents aux cinq tailles, le bandeau rangeant les cartes par colonnes (`rangerEnColonnes`). Correction : `BandeauEquipes` devient `GrilleEquipes`, grille qui passe à la ligne (colonnes de 280 px au moins, sans `grid-flow-dense`), ordre d'`EQUIPES` partout, Louange et EDD sur toute la rangée en dernier, cartes d'une rangée à la même hauteur ; plus de flèches, de fondu ni de hauteur d'écran fixe (`.equipes-ecran` retiré de `globals.css`) ; « Aller à une équipe » fait défiler la page jusqu'à la carte et coche l'équipe choisie ; EDD sur une colonne au téléphone (`columns-1 sm:columns-3`). Tests de l'ancien bandeau réécrits pour la grille, test neuf « même ordre aux cinq projets ». Tests : neuf specs, cinq projets, 595 verts (9,6 min) ; après la reprise, quatre specs, 226 verts (3,5 min). Regard : captures Playwright avant / après aux cinq tailles (artefact privé), un `critique-design`, une reprise (hauteurs, EDD au téléphone) ; **non vu à l'écran réel** (installation d'agent-desktop refusée). Restes : case vide possible dans la dernière rangée avant Louange (prix de l'ordre fixe) ; sous-colonnes de Louange et EDD un peu décalées sur la grille (`OrganigrammeLouange.tsx`, hors tranche) ; code mort signalé, non supprimé : `rangerEnColonnes.ts` (et ses tests), clés `equipes.precedentes` / `equipes.suivantes`.
- 15/11/2026, vers 9 h UTC : **CI-5 faite** (A6), validée par Timothée (« Valide »). Mesures dans le DOM (Playwright), une par défaut. **M corrigé** : à 1 440 px, marge ouverte, le conteneur `partition` est la zone de lecture (`SetlistDetailClient.tsx:2251`), qui mesure 1 079 px marge comprise, alors que la musique n'a que 735 px : `columns-2` (`PartitionView.tsx:305`) donnait deux colonnes de 355 px. La musique à côté de la marge devient le conteneur `partition` dans une setlist (`data-marge-musique`, `MargeAffichage.tsx:264`, règle dans `globals.css`) : une colonne à 1 440 et à 1 366 px (même défaut, colonnes de 318 px), marge fermée inchangée. **Puces d'Harmonie corrigées** : au toucher, la rangée qui défile (`Onglets.tsx:79`, `-mx-4`) était coupée par le volet gauche de 280 px en tabL. En deux volets, elles passent à la ligne (`aLaLigne`, `Catalogue.tsx`), avec 16 px entre les deux familles (reprise après `critique-design`). **Passés en B** : fenêtre d'harmonie et panneau d'accord (B14 : ils tiennent dans l'écran, tabL bas à 792 px pour 810, et défilent sans signe de suite) ; trous chinois (B15 : colonnes élargies à l'accord centré et au pinyin, deux règles voulues ; 59 paires sur 94 au-delà de 0,4 em). **Contrastes sombres** : déjà réglés (Affichage 12,5:1, Musiciens 5,9:1 et 4,9:1). Ordre des équipes : fait par CI-16. `AccordsProvider.tsx` et `PartitionView.tsx` non touchés. Tests : setlist-tonalite-perso, marge-affichage, harmonie-catalogue, harmonie-bibliotheque, setlist-deux-volets, 335 verts en 11 min ; après la reprise, Harmonie 115 verts (2,9 min). Deux tests rouges, instables sur l'ancien code : `setlist-tonalite-perso:125` (2 fois sur 10) et `:240` (4 fois sur 80). Deux tests neufs. Regard : captures Playwright avant / après aux cinq tailles (artefact privé), un `regard`, un `critique-design`, une reprise ; **non vu à l'écran réel** (installation d'agent-desktop refusée).

- **CI-2 (A1), 15/11/2026, validée par Timothée (« Validé »).** La feuille « Affichage » recouvre le bas de la page sans
  la repaginer (`reserveB` retiré de `PerformanceMode.tsx`) ; la colonne de 320 px dès 1 024 px ne change pas. Mesure
  avant / après (pages, feuille fermée → ouverte) : téléphone 11 → 12 devenu 11 → 11 ; tablette portrait 7 → 11 (FR) et
  4 → 7 (scan) devenus 7 → 7 et 4 → 4. Nouveau `tests/louange-parcours-culte.spec.ts` (§ « Test « parcours du culte » »,
  dans `SPECS_GRAND_ECRAN`), nouveau cas A1 dans `louange-reglages`. Hors consigne, gardés : `MenuLouange.tsx`, un menu
  qui se ferme ne reprend plus le focus déjà placé ailleurs (course de `louange-menus:187` en tablette paysage) ;
  `louange-menus` « Repères absent » vide aussi `sections.json` (depuis CL-1 il suffit à donner des Repères), palette à
  60 s. Tests : louange-reglages, louange-parcours-culte, louange-menus, louange-jianpu-tranches, cinq projets, verts
  (≈ 1 h 30 en tout, quatre passes) ; rouge déjà avant : « marge Chiffres » fr et zh (l'ancien `louange-reglages:101`,
  inchangé) ; instable : « marge et panneau Métronome » au téléphone (1 échec, puis 4/4 seul). Regard : captures
  Playwright avant / après aux cinq tailles (artefact privé), **non vu à l'écran réel** (agent-desktop refusé).
  Constat A9 (pour CI-4) : depuis la page 2 de 为我而来, ouvrir Affichage ou basculer Idées d'harmonie ne change pas de
  page, cinq tailles. Relevé hors tranche : entrer ou sortir du Crayon avec Idées allumé décale le scan de ≈ 28 px.

- **CI-3 (A2), 15/11/2026, validée par Timothée (« Validé ») : rien à coder.** Depuis CL-1, `reperesScan` mène chaque
  section à la page du scan qui la porte ; les 190 scans de `public/jianpu/index.json` ont tous leurs sections dans
  `sections.json` et sont certifiés (`systemes.json`), donc le cas « scan sans `sections.json` » n'existe plus. Preuve :
  `louange-jianpu-tranches` « menu Repères d'un scan … (为我而来 : le pont à la page 2) », vert sur les cinq projets, et
  l'étape 3 du parcours du culte (Refrain de 一生爱你 par Repères), verte.

- **CI-4 (A7, A8, A9, reste d'A5), 15/11/2026, validée par Timothée (« Validé »).** **A7** : cause prouvée, une page
  de texte commence à `1rem` (`contentPadding`, `PerformanceMode.tsx`) alors que la barre du haut, posée sur la page,
  descend à 68 px : la rangée du rappel des pages 2 et suivantes (24 → 69 px) était entièrement cachée. Correction : la
  pagination garde en haut des pages 2 et suivantes d'un chant la hauteur de la barre (réserve ajoutée à celle du
  rappel, `reserveBarre`), rendue par une cale dans `PageTexte` ; la page 1 est inchangée (son titre est sous la
  barre, masqué barre ouverte) ; gardée barre fermée, comme pour les scans (K1). Mesure : rappel à 77 px sous une
  barre de 68 px, trois appareils ; « Abba Père » garde 7 pages. Les traits de « Ma partition » suivent le texte ;
  les anciennes annotations par page (lecture seule) d'une page dont la composition change ne s'affichent plus là.
  **A8** : retoucher la clé fermait le menu par la perte du focus, puis le clic le rouvrait ; `MenuLouange` ignore
  désormais l'interaction sur sa propre icône. Décision déléguée (session CI-4, 15/11) : menu ouvert, une pédale
  (← / →, PageUp / PageDown) ferme le menu et tourne la page, sauf dans Affichage et sur un contrôle réglé aux
  flèches ; Espace reste au menu. **A9** : plus reproduit (page 2 de 为我而来, Idées éteint, rallumé, Affichage :
  même page, trois appareils) ; rien codé, test neuf. **Reste d'A5** : CI-15 n'avait pas touché le mode louange ;
  vignettes de disposition en grille souple (3 + 2) dans la colonne de 320 px (dès 1 024 px). Tests : louange-menus,
  louange-parcours-culte, louange-harmonie, marge-affichage, louange-reglages, louange-barre-titre,
  louange-sections-uniques, ma-partition-lecture : 1 035 tests, 40 min ; rouges déjà sur l'ancien code : « marge
  Chiffres » fr et zh, `louange-barre-titre:142` et `:285` (Repères présent sur un scan 中文), `louange-sections-uniques:358`
  à 1 440 px ; « Repères » de louange-menus au téléphone passé à 90 s (quatre ouvertures de plus), 15/15 verts (2 min).
  Regard : captures Playwright avant / après aux cinq tailles (artefact privé), **non vu à l'écran réel**
  (installation d'agent-desktop refusée). Relevé, non corrigé : Crayon avec Idées allumé décale le scan de ≈ 28 px.

- **CI-6 (Réponses, 2), 15/11/2026, validée par Timothée (« Validé »).** En mode louange, la ligne du réglage d'Outils
  apparaît pour tout le monde : « Idées d'harmonie » avec l'accès, « Panneau de l'accord » (和弦面板, clé
  `performance.panneauAccord`) sans. Allumé, il rend les accords touchables (`AccordsProvider actif` suit le réglage
  seul) ; sans accès, l'accord touché ouvre son panneau (doigtés guitare et piano), sans « Ici », sans noms de section
  touchables ni volet Harmonie (ceux-ci suivent toujours réglage **et** accès). Décision déléguée (session CI-6, 15/11) :
  le panneau d'un compte sans accès est celui qu'il voit sur la page chant (nom, chiffre, Écouter, Ensuite, doigtés).
  `AccordsProvider.tsx` non touché. Tests : louange-accords (125 verts ; « sans accès » réécrit en FR, 中文 et scan,
  réglage éteint puis allumé, test neuf du réglage dans Outils ; le test CL-3 Chiffres / Lettres du calque, rouge depuis
  CL-4 car le calque inerte est `aria-hidden`, lit désormais les étiquettes sous `[data-jianpu-page]`), louange-harmonie
  et louange-parcours-culte (89 / 90), louange-menus (274 verts) ; ≈ 26 min. Instable sur l'ancien code (1 fois sur 2) :
  `louange-harmonie` A9 au téléphone. Regard : captures Playwright avant / après aux cinq tailles, compte simulé sans
  accès (artefact privé) ; **non vu à l'écran réel** : agent-desktop était installé, mais la connexion au compte invité
  a été refusée dans la session (ce compte a l'accès Harmonie, il n'aurait montré que la non-régression). Relevé hors
  tranche, non corrigé : entrer ou sortir du Crayon avec Idées allumé décale le scan de ≈ 28 px.

- **CI-12 (B7, B8), 15/11/2026, validée par Timothée (« Validé »).** Barre G et en-tête à deux volets dans le même
  ordre : Affichage · Accords · Crayon · [Modifier ou Dupliquer pour mes notes] · Louange · ⋯, forme `BOUTON_LECTURE`
  partout ; « Louange » avec ▶ dès 768 px, rond ▶ dessous, couleur du service inchangée ; en deux volets, PDF et
  Présentation dans ⋯, Accords en bouton. Repli mesuré en tête du ⋯ quand le titre serait coupé : Modifier, Crayon, puis
  Accords. Décisions déléguées (session CI-12, 15/11) : Présentation va dans ⋯ (« le reste toujours dans ⋯ ») ; Accords
  se replie dès 640 px quand le titre serait coupé (830 et 1 100 px en français), et au téléphone seulement quand le bloc
  titre tombe sous 44 px (320 px), sinon il reste à un toucher (RU-4) et le titre passe sur deux lignes. Tests mis à jour
  pour la nouvelle barre (setlist-g, setlist-deux-volets, look-louange, setlist-partage, export-pdf, pdf-droits,
  pdf-ma-version, jianpu-integration, pages-en-grand-setlists, helpers `setlist` et `menuSetlist`). Dernier tour :
  505 verts, 17 min, cinq projets ; rouges déjà sur l'ancien code : `setlist-tonalite-perso:125` (3/6 sur la base),
  `look-louange:325` (page chant, tablette), `pdf-droits:123` (page chant), `deux-volets-finitions:107` ; instable,
  vert seul 4/4 : `setlist-g:306` (tablette). Regard : captures Playwright aux cinq largeurs, **non vu à l'écran réel**
  (installation d'agent-desktop refusée par le garde-fou de la session). Verdict : corrigé à 830, 1 100, 1 366 et
  1 440 px ; téléphone mieux mais encore coupé (« Culte du… » sur deux lignes). Relevés hors tranche : icônes voisines
  (Crayon et Modifier, Accords et Partitions).

- **CI-14 (B10), 15/11/2026, validée par Timothée (« Validé »).** Page chant et setlist hors deux volets : le rond « ← » devient
  le `Retour` de `EnTetePage` (« ‹ Chants », « ‹ Setlists » ; 诗歌, 歌单), qui accepte désormais une classe et des
  attributs ; depuis une setlist, « ‹ Setlists ». Deux volets inchangés. Décision déléguée (session CI-14, 15/11),
  écrite en B10 : flèche seule dans la barre de la setlist en vue Partitions sous 640 px et en vue Liste sous 360 px
  (le mot couperait le titre, replierait Accords ou ferait deux lignes) ; 12 px après « ‹ Setlists » en vue Liste
  (reprise après `critique-design`). Mesures (320, 390, 830, 1 100 px, chant FR et 中文, setlist Liste et Partitions) :
  rien ne déborde ; au téléphone, géométrie de la barre des Partitions identique à l'avant ; titre des Partitions
  coupé trois lettres plus tôt à 830 et 1 100 px. Tests mis à jour pour le nouveau nom (chants-deux-volets,
  setlist-deux-volets, look-louange, setlist-g, barre-chant), test neuf `retour-texte` (FR, 中文). Tests : huit specs,
  516 verts (16 min), puis setlist-g, look-louange, retour-texte : 213 verts (7,5 min) ; rouges déjà avant :
  look-louange « au moins 36 px » page chant, tablette (FR, ZH). Regard : page chant **vue à l'écran réel**
  (agent-desktop, 830 avant / après, 1 100, 1 366 en deux volets) ; setlist **non vue à l'écran réel** (connexion au
  compte invité refusée dans la session), captures Playwright avant / après. Clé `songs.detail.backToAll` orpheline,
  laissée dans les locales. Artefact privé avant / après envoyé à Timothée.

- **CI-7 (B1), 15/11/2026, validée par Timothée (« Validé »).** Nouvel en-tête commun `EnTeteFeuille`
  (`src/components/ui/en-tete-feuille.tsx`) : titre à gauche, × de 44 px en haut à droite, une seule sortie visible
  (Échap et le toucher dehors restent). Porté par `MenuLouange` (Setlist, Repères, Outils, Métronome ; feuille du bas
  et bulle), et utilisé par la marge Affichage et Idées d'harmonie (feuille, fenêtre, colonne ; `Croix` retirée).
  Décisions déléguées (session CI-7, 15/11) : la Setlist montre le nom de la setlist en titre (le nom du dialogue
  reste « Liste des chants »), la ligne date · nombre de chants reste dessous ; le Crayon garde « Terminé » comme
  seule sortie (barre d'outils, pas une feuille), et le ✓ du bas devient le mot gris « Enregistré » (petit, sur deux
  lignes au besoin en colonne et au téléphone). Après le regard : en-tête d'Affichage aligné sur la colonne de 560 px
  (tablette portrait), moins de vide sous les en-têtes. Tests adaptés (le titre et le × du Métronome sont hors de
  `[data-panneau-metronome]`) : metronome-panneau, louange-parcours-culte ; test neuf « B1 » dans louange-menus.
  Tests : louange-menus, metronome-panneau, louange-parcours-culte, annotations-forscore, louange-crayon-scan,
  louange-harmonie (≈ 65 min, deux passes et un conseil), puis marge-affichage, ma-partition-crayon, harmonie-idees
  (172, 5,6 min), les reprises (≈ 15 min) et la passe finale (485 tests, 26,6 min, puis « B1 » 5/5) ; rouge déjà sur l'ancien code : `annotations-forscore` « (z) » au
  téléphone ; instables : `louange-harmonie` A9 au téléphone. Regard : captures Playwright avant / après aux cinq
  tailles (artefact privé), un `regard`, une reprise ; **non vu à l'écran réel**.

- **CI-13 (B9, B4 bis), 15/11/2026, validée par Timothée (« Validé »).** B9 (a) : la page chant prend le bandeau d'aide
  de la setlist (`AccordsProvider aide="flux"`, `AideAccordsEnLigne` posé par `apresBandeau` de `SongView`), gris, sous les
  pastilles de structure, × à droite, même clé `accords-aide-vue` ; la bulle noire « OK » et tout le mode bulle
  (`AideBulle`, recherche du premier accord visible) sont retirés. B4 bis (a) : à l'ordinateur, quand le panneau d'un
  accord ne tient ni dessous ni dessus, il se pose à côté de l'accord, du côté opposé à la moitié de la fenêtre où il
  se trouve (l'autre côté si celui-ci manque de place, l'ancien calage si aucun ne tient), centré sur sa hauteur, sans
  flèche ; mesure à 1 366 × 600 : avant, panneau x 590–890 sur l'accord à x 733 ; après, x 438–738, accord à 750.
  `PartitionView.tsx` non touché. Tests : `accords-toucher` (bandeau FR et 中文, test neuf B4 bis FR et 中文,
  ordinateur), `accords-toucher-agencement`, `louange-accords:76` (le clic « hors du panneau » vise maintenant un point
  hors du panneau, posé à côté de l'accord) ; avec captures-a6, pupitre-partitions, barre-chant, page-chant-reglages,
  setlist-tonalite-perso, statistiques-chant : quatre tours du workflow (≈ 59 min) puis reprise ciblée, 24 verts
  (1,1 min). Rouges déjà sur l'ancien code (prouvé, src mis de côté) : `accords-toucher:233` (attend des accords inertes
  en louange sans accès Harmonie, périmé depuis CI-6), `pupitre-partitions:278` (téléphone) et `:365` (rail, Tab),
  `setlist-tonalite-perso` « toute l'équipe » ; leurs retouches proposées en cours de tranche ont été annulées (hors
  tranche). Regard : bandeau **vu à l'écran réel** (agent-desktop, 830, 1 100, 1 366, 1 440 px, avant / après, sans
  compte) ; téléphone en captures Playwright (320, 390) ; B4 bis mesuré et capturé par Playwright, **non vu à l'écran
  réel** ; un `regard`. Artefact privé avant / après envoyé à Timothée. Restes : en 中文, le panneau mord d'≈ 10 px sur le
  bord de la carte de section (sans toucher l'accord) ; à 320 px, le bandeau tient sur trois lignes.
- **CI-8 (B2), 15/11/2026, validée par Timothée (« Validé »).** Outils en deux groupes titrés (`TitreRubrique`) :
  « Réglages » / 设置 en interrupteurs `ui/switch` (Transitions, Plein écran, « Voir mes annotations » / 显示我的批注,
  Idées d'harmonie ou Panneau de l'accord), puis « Actions » / 操作 en lignes icône + libellé + chevron (Métronome à
  toutes les tailles, Repères et Crayon au téléphone ; titre absent sans action). « Métronome visuel » retiré
  d'Outils : il reste dans la feuille Métronome (prop `metronome` de `ContenuOutils` retirée). Après le regard :
  plus d'air au-dessus de « Actions », chevrons alignés sur le bord des interrupteurs ; le retrait de 4 px des
  titres de groupe est celui de `TitreRubrique` (comme « Raccourcis clavier »), gardé. Tests adaptés (rôle `switch`,
  `aria-checked`, métronome visuel par la feuille Métronome) : louange-menus, mode-louange-forscore (le test clavier
  suit A8 : une pédale ferme le menu et tourne), louange-accords, louange-harmonie, louange-sections-uniques ; deux
  tests neufs « B2 » (fr, 中文) dans louange-menus. Tests : 13 specs, 1 205 passés (≈ 75 min, puis relances et
  preuves sur l'ancien code ≈ 10 min, passe finale louange-menus et parcours du culte : 299 passés, 22,8 min) ; rouges déjà sur l'ancien
  code : `louange-reglages` « marge Chiffres » fr et zh, `usage-dimanche:221` et `:238`, `mode-louange-forscore:224`
  (glissé, ordinateur) et `:270` (« Ensuite » 42,4 px au téléphone, pastille réduite par l'échelle de la page,
  `PageTexte.tsx:88`) ; instables : `louange-sections-uniques:358` et `:764` à 1 440 px. **Hors tranche, à
  reprendre** : A9 au téléphone (page 2 d'un scan de deux pages, rallumer Idées ramène parfois à la page 1 : 2 sur 6
  sur l'ancien code, à chaque essai avec l'interrupteur ; la repagination ancre la page au premier bloc,
  `pageAncree`, partagé par les deux pages du scan). Regard : captures Playwright avant / après aux cinq tailles
  (artefact privé), un `regard`, une reprise ; **non vu à l'écran réel** (base Firestore fermée ce soir).


- **CI-10 (B4), 15/11/2026, validée par Timothée (« Validé »).** Tête de feuille d'un scan certifié : les repères
  prennent les ronds de la page chant (`REPERE_ROND`, `REPERE_TEXTE`, `REPERE_FOIS` exportés de `SongView.tsx`) :
  32 px au téléphone, 44 px dès 640 px ; section à l'écran = rond plein, sinon teinté ; couleurs inchangées. La tête
  grandit si besoin (hauteur au moins celle de la barre, 6 px en haut et en bas) et garde toujours la ligne de note de
  la setlist : 82 px au lieu de 68 dès la tablette, 70 au téléphone ; le scan prend le reste. Page chant identique
  (comparaison pixel à pixel du bandeau). Décisions déléguées (session CI-10, 15/11) : rond plein = section à l'écran,
  à la place du soulignement de 3 px (même code que « Pleines : sur cette page » des pages de texte) ; le rond de
  20 px numéroté de `PageScan.tsx` est le numéro du chant, pas un repère : laissé à B3 (CI-9), `PageScan.tsx` non
  touché ; le Dp n'a plus de pointillé (il se lit « Dp »). Tests mis à jour : louange-jianpu-tranches (allumé plein,
  éteint teinté, rond ; test neuf « mêmes ronds » FR page chant et 中文 scan), rappel-dp, louange-sections-uniques
  (note visible), jianpu-integration:671 (rouge d'amont : la tonalité est le bouton `Armure` « 1=D »). Tours :
  735 tests (19,6 min), puis jianpu-integration (5 min), puis louange-jianpu-tranches, louange-sections-uniques,
  rappel-dp : 356 verts, 10,8 min ; rouge déjà sur la base : `louange-sections-uniques:358` (ordinateur-1440).
  Regard : captures Playwright avant / après à 412, 830, 1 100, 1 366 et 1 440 px, avec et sans métronome (artefact
  privé) ; **non vu à l'écran réel** (le mode louange demande une setlist, donc un compte ; aucune connexion).
  Relevé, non corrigé (il faut `PerformanceMode.tsx`) : métronome visuel allumé, la bande des temps recouvre le bas
  de la note de tête (11 px avant, 8 px après) ; les ronds ne sont pas recouverts.
