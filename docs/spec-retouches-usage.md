# Spec : lot 1 du rapport d'usage, retouches qui ne déplacent rien

Origine : `docs/audit-usage-2026-11-11.md`, § « Lots proposés », lot 1 ; décision 1 de Timothée
(`docs/spec-pupitre-musicien.md`, § « Décisions de Timothée après le rapport d'usage »). Spec écrite le 11/11/2026
sur `claude/corrections-design` (tête `1e81d1c`). **Rien n'est codé : le go de code reste à donner, lot par lot.**

## Périmètre

Les constats d'effort « retouche » qui ne changent **ni l'organisation ni l'apparence** d'un écran : zones de toucher
de 44 px, textes coupés, menus, retours, liens morts, mentions en double, messages de refus. Tout ce qui déplace un
bloc, change une colonne ou demande un dessin est écarté (lots 2 à 5) ; les animations aussi (lot 6).

Chaque constat gardé a été **relu dans le code** au `chemin:ligne` qu'il cite (trois chercheurs, 46 constats,
11/11/2026) : tous sont vrais sur la tête de branche ; plusieurs ne le sont qu'en partie, la partie gardée est dite.
Quand un constat mêle une retouche et un déplacement, seule la retouche entre ici.

## Règles communes

- **Zones de 44 px** : uniquement par `src/lib/toucher44.ts` (`TOUCHER_44`, `TOUCHER_SEGMENT`, `TOUCHER_RANGEE`,
  `TOUCHER_PILULE`). Le dessin ne grandit pas. Pièges relevés : la base met `relative` (jamais sur un élément
  `absolute`) ; un `<input>` ne porte pas de `::after` (zone sur le `<label>` parent) ; un parent en
  `overflow: hidden` ou `truncate` rogne la zone (la poser sur le parent) ; deux zones voisines ne se recouvrent pas
  (`TOUCHER_PILULE` quand l'écart est sous 8 px).
- **Textes** : `line-clamp-2` ou retour à la ligne à la place de `truncate` ; aucun texte ne passe sous 12 px.
- Libellés nouveaux en français **et** en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`).
- **Zones gelées** (`docs/audit-ui-apple-design.md` § 2) : couleurs de `serviceColors.ts`, logo, couleurs des accords,
  du 简谱 et des sections (`--chord-color`, `--jianpu-color`, `--sec-*`), intérieur du calque 简谱
  (`JianpuSheet`, calques certifiés), export PDF. Aucune tranche n'y touche ; aucune ne touche au mode louange
  (`src/components/performance/`, réservé à la planche du pupitre).
- **Tests** : une spec par tranche, `tests/retouches-usage-tN.spec.ts`, sur les trois appareils. Une vérification de
  zone tactile se saute hors toucher, avec la raison dans le `test.skip` et « appareils tactiles » dans le titre ;
  modèle : `tests/equipes-page.spec.ts:124-131` (hauteur du `::after` ≥ 44, dessin < 44, toucher à 20 px du centre).
  Pages connectées : `tests/helpers/fakeSession.ts`, noms inventés. Les captures se regardent sur les quatre
  dispositions (plus 1 440 px pour la page chant et la setlist).

## Tranches

### T1 — Zones de 44 px : chants, setlist, édition, plannings, questionnaire (10 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| dimanche-7 | `src/components/setlists/editeur/Reglages.tsx:98-108`, `:289`, `:299`, `:349` | `TOUCHER_44` sur les douze tonalités, « + section » et « + Dernière phrase » ; Note, Nuance, Transition, Modulation (26 px, 6 px d'écart) : `TOUCHER_PILULE`. |
| dimanche-10 | `src/components/harmonie/IdeesSheet.tsx:321-327` | `TOUCHER_44` sur « Ne marche pas sur ce chant » (la confirmation est hors lot : voir écartés). |
| dimanche-11 | `src/app/setlists/[id]/_components/Sommaire.tsx:99-109` | `TOUCHER_PILULE` sur les pastilles de section ; écart du parent de 4 à 6 px (`gap-1` → `gap-1.5`), seul changement visible, d'un trait. |
| chants-4 | `src/app/songs/[slug]/SongDetailClient.tsx:492-505` | `TOUCHER_SEGMENT` sur la bascule 简谱 / Paroles (`h-7`). |
| chants-8 | `src/app/songs/statistiques/StatistiquesClient.tsx:405-412` | `TOUCHER_44` sur les deux `<label>` des dates libres. |
| evenements-app-2 | `src/app/questionnaire/page.tsx:90`, `:113` | `TOUCHER_PILULE` sur les pastilles de réponse (`h-9`, écart 8 px). |
| accueil-compte-12 | `src/components/moi/Apercus.tsx:43-48` | `TOUCHER_44` sur « Tout voir » des aperçus. |
| plannings-6 | `src/components/planning/GrilleHistorique.tsx:25-31` | `TOUCHER_44` sur « Historique ». |
| services-9 | `src/components/planning/BarreDeGrille.tsx:105-108` | Croix du prénom (≈ 34 px, `absolute`) : zone `::after` à `-inset-[5px]` au toucher, écrite à la main (pas `TOUCHER_44`, qui mettrait `relative`). |
| services-10 | `src/components/push/PushPrompt.tsx:78-84` | Croix du bandeau des rappels : zone de 24 px à la souris (`after:-inset-1`), la zone tactile existe déjà. |

Test : `tests/retouches-usage-t1.spec.ts` ; au toucher, pour chaque commande, `::after` ≥ 44 px et dessin inchangé ;
toucher la tonalité voisine sélectionne bien la voisine (pas de recouvrement) ; à la souris, croix du bandeau ≥ 24 px.
Un chant FR et un chant ZH pour chants-4.

### T2 — Zones de 44 px : équipes, tâches, réunions (8 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| equipes-taches-app-2, bo-equipes-3 | `src/app/equipes/EquipesClient.tsx:349` | `TOUCHER_44` sur le nom de l'équipe (lien de 20 px) ; le chevron ou la carte entière restent au lot 2. |
| equipes-taches-app-3 | `src/components/taches/TacheLigne.tsx:79` | Le bouton d'ouverture prend toute la hauteur de la ligne (`self-stretch`, parent compris), sans changer le dessin. |
| equipes-taches-app-4, bo-reunions-taches-1 | `src/components/taches/FicheTache.tsx:257` ; `src/app/equipes/[id]/PageEquipe.tsx:132-138` | `TOUCHER_RANGEE` sur les segments d'état ; `TOUCHER_44` sur « Nouvelle tâche / réunion » (`BoutonSection`). |
| bo-reunions-taches-1 | `src/components/reunions/EnTeteReunion.tsx:43`, `:48` ; `src/components/reunions/ReunionForm.tsx:137`, `:140` ; `src/components/reunions/SujetsAborder.tsx:58` | `TOUCHER_44` sur Modifier, Dupliquer, la corbeille, « Ajouter un lien », la poignée des sujets. |
| bo-equipes-18 | `src/components/groupes/OrganigrammeGroupe.tsx:215` | `TOUCHER_44` sur « Nommer » (`h-8`). |

Test : `tests/retouches-usage-t2.spec.ts` (session simulée, compte administrateur fictif) ; zones mesurées comme en T1 ;
toucher le bas d'une ligne de tâche ouvre la tâche.

### T3 — Zones de 44 px : calendrier et planning (4 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| bo-evenements-7, bo-reunions-taches-1 | `src/app/back-office/calendrier/CalendrierClient.tsx:112-113` | `TOUCHER_44` dans `BOUTON_ROND` (flèches du mois, « Aujourd'hui »). |
| bo-reunions-taches-1 | `src/components/layout/MenuActions.tsx:73` | `TOUCHER_44` aussi sur le « ⋯ » non compact. |
| bo-messages-planning-3 | `src/components/planning/PlanningGrille.tsx:707`, `:770-780` | Cases de nom (32 px) : zone de 44 px posée sur la cellule parente, la case porte `truncate`. |
| bo-messages-planning-9 | `src/components/planning/ChoisirNom.tsx:193` | `TOUCHER_44` sur les lignes de 40 px de la feuille de choix d'un nom. |

Test : `tests/retouches-usage-t3.spec.ts` ; zones mesurées ; au téléphone, toucher entre deux cases ouvre la bonne.

### T4 — Menus déroulants (2 fichiers) — Q1 : option (a)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| dimanche-8, chants-3, equipes-taches-app-8, bo-equipes-14 | `src/components/ui/menu.tsx:91` | Le plafond de 294 px au toucher (320 px à la souris), posé au lot CD T3b, coupe les listes longues (catégories, Thème, Service, « Aller à une équipe ») alors que l'écran est libre dessous. Décision Q1 (a) : retirer les deux plafonds fixes ; le menu grandit jusqu'à `--radix-dropdown-menu-content-available-height` moins 8 px, au toucher comme à la souris. |
| bo-messages-planning-5 | `src/components/layout/MenuActions.tsx:78-79` | Le menu « ⋯ » du dimanche ne sort plus de l'écran : `max-w-[min(20rem,calc(100vw-1rem))]` et `collisionPadding` de 8 px. |

Test : `tests/retouches-usage-t4.spec.ts` ; menu « Tous les services » ouvert au téléphone et en tablette : la rubrique
Groupes est entière sans défilement intérieur quand la place existe, et le menu reste à 8 px au moins du bas ; menu
« ⋯ » du dimanche entièrement dans la fenêtre au téléphone.

### T5 — Textes coupés (8 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| chants-6 | `src/app/songs/SongListClient.tsx:442-449` | La ligne pinyin · artiste passe à la ligne (`flex-wrap`) au lieu de couper le pinyin. Chant ZH. |
| musiciens-1 | `src/components/harmonie/rd2000/Rd2000Harmonie.tsx:98` | Retirer `[overflow-wrap:anywhere]` : le nom du son ne se casse plus en pleine syllabe. |
| musiciens-7 | `src/components/harmonie/Catalogue.tsx:268` | Ambiances : `line-clamp-2` au lieu de `truncate`. |
| services-4, bo-messages-planning-1 | `src/components/planning/GrilleCelluleDate.tsx:42`, `:51`, `:61`, `:66-70` | Retirer `whitespace-nowrap` (les étiquettes passent à la ligne dans leur case au lieu de couvrir la Présidence) ; « Non publié » écrit une fois en tête quand tout le trimestre est en brouillon, plus sur chaque ligne. |
| bo-messages-planning-2 | `src/components/planning/PlanningGrille.tsx:900`, `:945` | Intitulés de poste sur deux lignes (`line-clamp-2`) au lieu d'être coupés ; largeurs et rembourrages inchangés (resserrer la grille est au lot 3). |
| bo-reunions-taches-10 | `src/components/calendrier/GrilleMois.tsx:32` | Titre de réunion : `line-clamp-2` au lieu de `truncate`, dans la hauteur de case actuelle. |
| dimanche-9 | `src/app/globals.css:683-689` ; `src/app/setlists/[id]/SetlistDetailClient.tsx:98` | Fenêtre ≥ 1 024 px et barre de la setlist sous 880 px de conteneur : afficher le libellé court (aujourd'hui seulement sous 1 024 px de fenêtre), plus d'icônes seules. |

Test : `tests/retouches-usage-t5.spec.ts` ; pour chaque texte, `scrollWidth <= clientWidth` (pas de coupure) et pas de
recouvrement entre la cellule Date et Présidence ; dimanche-9 sur l'ordinateur à 1 100 px, barre dépliée (titre :
« ordinateur »).

### T6 — Retours et liens morts (≈ 10 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| equipes-taches-app-1 | `src/app/equipes/[id]/PageEquipe.tsx:47-49` ; liens vers `/equipes/…` (`EquipesClient.tsx`, `CartesAcces.tsx`) et vers `/taches/…` depuis la page d'équipe | Le retour suit la provenance par `?depuis=` posé par le lien : « ‹ Équipes » depuis l'organigramme, « ‹ Moi » depuis Moi ; une tâche ouverte depuis une équipe revient à l'équipe. Sans paramètre, le retour actuel. |
| musiciens-8 | `src/components/accords/PageAccords.tsx:67` ; `src/components/accords/PanneauAccord.tsx:301` | « ‹ Chants » ne s'affiche que si l'on vient d'un chant (le lien du panneau pose `?depuis=<slug>` et le retour mène au chant) ; ouvert par l'onglet de l'Espace Musiciens, pas de retour. |
| accueil-compte-3 | `src/app/(auth)/profil/page.tsx:101` | Après « Enregistrer », sans `?from=`, retour à `/moi` et plus à `/setlists`. |
| services-5 | `src/components/mesServices/DetailService.tsx:172-179` | Chaque chant de la setlist du service devient un lien vers le chant à la tonalité de la setlist (`?key=` en JSON, comme la page setlist). |
| musiciens-5 | `src/components/harmonie/FicheHarmonie.tsx:230-236` | Chaque titre de « Où l'entendre » devient un lien vers le chant, retrouvé par son titre comme le fait la liste des « chants qui le jouent » ; un titre introuvable reste du texte. |
| bo-equipes-15 | `src/components/admin/Personnes.tsx:200`, `:481` ; `src/components/admin/PersonnesVolets.tsx:162` | Filtre « Sans équipe » vide : une phrase (« Tout le monde a une équipe. ») et « Retirer le filtre ». |

Test : `tests/retouches-usage-t6.spec.ts` ; chaque retour mène à la page d'origine ; chants du service cliquables,
tonalité conservée (un FR, un ZH) ; « Où l'entendre » ouvre le chant ; filtre vide propose sa sortie.

### T7 — Mentions en double et messages de refus (8 fichiers)

| Constat | Fichier:ligne | Changement |
| --- | --- | --- |
| bo-equipes-16 | `src/app/equipes/EquipesClient.tsx:412-414` | Le référent n'est plus nommé deux fois : même garde en `:413` qu'en `:414`. |
| equipes-taches-app-7, bo-equipes-17 | `src/components/taches/TacheLigne.tsx:54-55` | « Commencée par … » seulement si ce n'est pas le responsable déjà nommé. |
| bo-reunions-taches-11 | `src/components/taches/FicheTache.tsx:152`, `:179` | Tâche en cours : « commencée par » écrit une fois (sous-titre), plus dans l'historique. |
| bo-equipes-2 | `src/lib/tableauDeBord/aFaire.ts:13`, `:200` | À faire compte les noms à relier avec la même fonction que Personnes (`src/lib/groupes/personnes.ts:129`, titulaires compris) : un seul nombre. |
| evenements-app-3 | `src/app/questionnaire/page.tsx:224-229`, `:354-361` | « Suivant » refusé : la page défile jusqu'à la première question obligatoire sans réponse, marquée « Réponse attendue », et le message se répète au-dessus du bouton. |
| evenements-app-10 | `src/components/messages/Notifier.tsx:133-136` ; locales | Famille « Cultes » choisie sans culte : « Choisis un culte. » au lieu de « Choisis à qui écrire. ». |

Test : `tests/retouches-usage-t7.spec.ts` ; chaque mention apparaît une fois ; les deux nombres de noms à relier sont
égaux (données simulées) ; au questionnaire, depuis le bas de l'étape, « Suivant » fait voir la question manquante.

## Questions tranchées par Timothée (11/11/2026 : « go pour le lot 1, Q1 option a »)

**Décision Q1 : option (a)**, le plafond fixe disparaît pour tous les menus. Q2 : ordre recommandé.

- **Q1 — Hauteur des menus (T4).** Le plafond de 294 px au toucher a été posé au lot CD (T3b, 05/11/2026). (a)
  *Recommandé* : le menu grandit jusqu'à la place disponible, moins 8 px, sur tous les menus (`menu.tsx:91`) ; (b)
  seulement pour les menus longs (catégories, Thème, Service, équipes), par une option ; (c) garder 294 px et écarter
  T4 sauf le « ⋯ » du dimanche.
- **Q2 — Ordre.** Recommandé : T1, T2, T3 (même nature, mesures communes), puis T5, T6, T7 ; T4 après Q1.

## Constats écartés

Vrais mais hors lot 1, parce qu'ils déplacent, réorganisent ou demandent un dessin :
- dimanche-1, dimanche-3, dimanche-5, chants-5, chants-7, chants-9, musiciens-3, musiciens-4, musiciens-6,
  musiciens-11, accueil-compte-4 à -11, accueil-compte-13, services-1, services-6, services-7, plannings-1, plannings-2,
  evenements-app-1, -4 à -9, equipes-taches-app-5, -6, -9, bo-equipes-5, -6, -11, -12, -13, bo-evenements-1, -5, -6,
  bo-reunions-taches-2, -5 à -9, bo-messages-planning-4, -8, -10 : déplacent un bloc ou une commande, changent les
  colonnes ou la largeur (lots 2 à 4).
- dimanche-6 : la grille de cinq dispositions dépasse le menu de 224 px ; élargir le menu ou resserrer la grille
  change l'apparence (`ChoixDisposition.tsx:50`) → planche.
- dimanche-4, dimanche-12 : mode louange → planche du pupitre. musiciens-2 → planche Harmonie · Accords.
- dimanche-10 (partie « sans confirmation »), bo-equipes-4, plannings-5 : retirer pour tous, ou effacer pour de bon,
  d'un toucher ; une annulation est un comportement à dessiner.
- Parties écartées de constats gardés : champ prénom des plannings (services-9) et « Ajouter un sujet… »
  (bo-reunions-taches-1), des `<input>` qu'on ne peut agrandir sans les redessiner ; menu « ⋯ » de la page chant
  (chants-4), non localisé dans les lignes citées ; « Mes dates », « Je m'inscris » (plannings-6), « Comment ça
  marche ? » (accueil-compte-12), étoiles et réglage des inscriptions (evenements-app-2), menu « Groupe » de Personnes
  (bo-equipes-14), comité nommé deux fois (bo-equipes-18), phrase d'aide du « ⋯ » (bo-messages-planning-5) : non
  relus, à mesurer par le testeur de la tranche et à ajouter à la même tranche s'ils sont vrais (même correction) ;
  feuille du bas des équipes, chevrons, ligne entière cliquable, titre avec titulaire et coche (bo-equipes-3, -14,
  equipes-taches-app-2, -3, bo-messages-planning-9) : dessin, lot 2 ; retirer de la liste des 49 les chants déjà cités
  (musiciens-5) : change la liste, à décider sur la planche Harmonie ; rembourrages de la grille du planning
  (bo-messages-planning-2) : lot 3.
- Aucun constat gardé n'est faux ni déjà corrigé.

## Avancement

- 11/11/2026 : spec écrite (46 constats relus dans le code, sept tranches). En attente du go de Timothée pour le lot 1
  et de sa réponse à Q1. Rien n'est codé.
- 11/11/2026 : **go de Timothée pour le lot 1**, Q1 option (a). Codage confié à une session orchestratrice neuve
  (« AP · Lot 1 retouches d'usage »), même branche, une tranche à la fois, une ligne datée ici par tranche.
- 11/11/2026 : **T1 faite** (14 fichiers + `tests/retouches-usage-t1.spec.ts`, 62 passés sur trois appareils, tsc et
  lint propres). Non relus ajoutés (tous sous 44 px) : « Mes dates », « Je m'inscris » du petit déj, « Comment ça
  marche ? », étoiles du questionnaire, interrupteur des inscriptions. Écarts : bascule 简谱 / Paroles en
  `TOUCHER_RANGEE` (`TOUCHER_SEGMENT` ne donne que 36 px au téléphone) ; croix du prénom à `-inset-[6px]` (32 px de
  dessin, pas 34). Limites : aucun chant FR n'a de scan, la bascule n'est mesurée que sur un chant ZH ; plusieurs
  zones ne sont vérifiées que par les classes du source ; pastilles du Sommaire : quand elles passent à la ligne, les
  zones de deux rangées se recouvrent en hauteur (le toucher va à la rangée du dessous) ; bouton « Voir » des
  inscriptions (36 px) laissé, hors consigne.
- 11/11/2026 : **T2 faite** (8 fichiers + `tests/retouches-usage-t2.spec.ts`, 17 passés et 7 sautés hors toucher, toutes
  les commandes mesurées dans la page, aucune lecture de classes ; relecteur : bon). Écarts : segments d'état en
  `TOUCHER_RANGEE` (44 px aussi au téléphone) ; poignée des sujets en `TOUCHER_PILULE` (4 px d'écart avec la case
  voisine : zone de 44 px de haut, 34 de large). Ligne de tâche : le bouton d'ouverture couvre toute la ligne par
  `self-stretch -my-1.5 py-1.5`, hauteur et position du texte inchangées. Limite : un nom d'équipe de moins de 44 px a
  une zone qui déborde sur le crayon voisin (le crayon garde le toucher).
- 11/11/2026 : **T3 faite en partie** (4 fichiers + `tests/retouches-usage-t3.spec.ts`, 9 passés et 9 sautés hors
  toucher, mesures dans la page ; relecteur : bon). Calendrier (`BOUTON_ROND`, donc aussi « mois suivant » de l'agenda)
  et « ⋯ » non compact : `TOUCHER_44`. Cases de nom : la zone est sur la cellule (tablette) ou la ligne de carte
  (téléphone, `GrilleCarte.tsx`, fichier en plus), passée sous le contenu, et un toucher hors du bouton est renvoyé au
  bouton. **Seul changement visible** : au toucher, 12 px au lieu de 4 entre les lignes d'une carte du téléphone
  (sinon les zones de deux cases se recouvrent) ; regardé à l'œil, à confirmer par Timothée. **Non fait** :
  `ChoisirNom.tsx` (lignes de 40 px jointives dans une liste qui défile : une zone de 44 px n'y gagne rien ; il
  faudrait des lignes de 44 px, donc un dessin, lot 2).
- 11/11/2026 : **T5 faite** (10 fichiers + `tests/retouches-usage-t5.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN` ; avec les
  specs voisines 239 passés, 10 sautés sur les cinq projets). Les intitulés de poste trop longs étaient dans
  `GrilleEnTete.tsx` : `line-clamp-2` avec coupure en syllabes (`hyphens-auto` : « Prési-dence », vu à l'œil, au lieu
  de « Présidenc / e »). « Non publié » en tête (`data-non-publie-trimestre`, libellé existant en fr et zh) :
  `planning-grille.spec.ts` et `planning-2027.spec.ts` suivent la nouvelle mention. Reste à arbitrer : le bouton
  retour de la barre de la setlist reste une flèche seule (il n'a pas de libellé court).
- 11/11/2026 : **T6 codée, pas finie : tests rouges** (commit « T6 en cours »). Fait : tous les constats du tableau, plus
  musiciens-5 (« Où l'entendre » : titre normalisé cherché dans `songs-index.json`, le premier gagne ; 187 titres sur
  194 trouvés, les 7 autres sont des phrases et restent du texte) ; `?from=` du profil refuse aussi `//…` et `/\…`
  (redirection ouverte). Passe du 11/11 (`retouches-usage-t6`, `equipes-page`, `retouches-usage-t2`) : 141 passés,
  28 échoués. À reprendre : `equipes-page.spec.ts:73` attend `/taches/da/affiche` sans le `?depuis=equipe` désormais
  posé ; t6 : en-tête « DA » et « Mira » introuvables (données simulées de la page d'équipe), bouton « Enregistrer »
  du profil (nom accessible `profile.save`), « Voir tout le dictionnaire » introuvable (le lien porte
  `?accord=F%23m&depuis=abba-pere`), `[data-ou-l-entendre]` absent sur `/harmonie/substitutions/2m7-pour-4` (vérifier
  la route de la fiche), services-5 et bo-equipes-15 à relire. Ni testeur ni relecteur n'ont pu passer (limite de
  dépense atteinte pendant la tranche). **Reste ensuite : T7 puis T4.**
- 11/11/2026 : **T6 faite** (reprise du commit « T6 en cours »). Les échecs venaient des tests : liens à `/` final
  (`trailingSlash`), document `users/u-mira` absent, accès à Harmonie par le planning non simulé, lien « Chants » de la
  barre latérale confondu avec le retour (recherche limitée à `main`), profil rempli verrouillé hors admin (test passé
  en admin, comme `coherence.spec.ts`, qui suit aussi le retour à `/moi`). Ajouts : `?from=/songs` y ramène, `//…` et
  `/\…` ramènent à `/moi` ; liens des chants du service et de « Où l'entendre » en `TOUCHER_44` (le titre coupé passe
  dans un `<span>` intérieur pour que la zone ne soit pas rognée), zone mesurée au toucher. Passe :
  `retouches-usage-t6`, `equipes-page`, `retouches-usage-t2`, `coherence` : 209 passés, 13 sautés, puis le seul rouge
  (retour des accords, ordinateur) corrigé et repassé vert ; tsc et lint propres. Captures regardées sur les quatre
  dispositions (service, Personnes « Sans équipe », fiche Harmonie, page d'équipe) : rien ne bouge. **Point à
  trancher** : en deux volets (souris, ≥ 1 148 px), une tâche ouverte depuis une équipe s'affiche à côté de la liste
  des tâches, sans en-tête ni retour vers l'équipe ; le test vérifie le retour à 1 100 px. Ajouter un retour en deux
  volets serait un dessin (lot 2). **Reste : T7 puis T4.**
- 11/11/2026 : **T7 faite** (7 fichiers de code, locales, `tests/retouches-usage-t7.spec.ts`). Référent nommé une fois ;
  « Commencée par » absent de la ligne quand c'est le responsable (comparaison par uid) et de l'historique de la fiche
  (reste dans le sous-titre) ; À faire compte les noms à relier par `nomsSansCompte` de `personnes.ts`, titulaires
  compris (groupes illisibles : pas de rangée, plutôt qu'un nombre faux) ; questionnaire : « Suivant » refusé marque
  « Réponse attendue » (fr, 需要回答), fait défiler jusqu'à la première question manquante et répète le message
  au-dessus du bouton ; Notifier : « Choisis un culte. » (fr, zh). Specs suivies : `agencement-v18-taches` (historique
  sans « commencée par », mention comptée une fois), `agencement-v18-moi`, `a-faire`. Passe : t7, t2, `equipes-page`,
  `a-faire`, `agencement-v18-moi`, `-t5`, `-taches`, `taches`, `tableau-de-bord` sur les cinq projets : 1 197 passés,
  76 sautés, 6 rouges corrigés (tests) et repassés verts ; tsc propre. Captures du questionnaire regardées sur les
  quatre dispositions ; « Réponse attendue » déplacée après « · Plusieurs réponses possibles » (la ligne commençait
  par un point). Reste à nettoyer (hors lot, signalé) : l'ancienne `nomsSansCompte` de `tableauDeBord/donnees.ts` n'est
  plus utilisée que par `tableau-de-bord.spec.ts`. **Reste : T4.**
- 12/11/2026 : **T4 faite, lot 1 terminé.** `menu.tsx` : plus de plafond fixe (294 / 320 px), le menu grandit jusqu'à
  la place disponible moins 8 px, au toucher comme à la souris ; `MenuActions.tsx` : `collisionPadding` de 8 px et
  largeur au plus `min(20rem, 100vw − 1rem)`. `tests/retouches-usage-t4.spec.ts` : « Tous les services » au téléphone
  et en tablette, déclencheur remonté en haut, aucun défilement intérieur, dernière ligne entière, bas à 8 px au moins
  de la fenêtre (mesures après l'animation d'ouverture) ; « ⋯ » du dimanche dans la fenêtre au téléphone.
  `menu-primitive.spec.ts` suit la décision (bas à 8 px au lieu du plafond de 320). `harmonie-catalogue.spec.ts` :
  la mesure des lignes de 44 px ne compte plus les titres de « Où l'entendre » devenus liens en T6. Passe : t4, t3,
  `menu-primitive`, puis les huit specs qui mesurent des menus sur les cinq projets : 916 passés, 3 rouges (le test
  d'Harmonie ci-dessus), corrigés et repassés verts. Captures du menu regardées sur les quatre dispositions : au
  téléphone et en tablette portrait, le menu descend jusqu'à 8 px du bas et passe au-dessus de la barre d'onglets.
  **Points à trancher par Timothée** (tout le lot) : écart de 12 px entre les lignes des cartes du planning au
  téléphone (T3) ; `ChoisirNom` non fait (lignes de 40 px jointives, il faudrait un dessin, lot 2) ; pastilles du
  Sommaire qui se recouvrent en hauteur quand elles passent à la ligne (T1) ; bouton retour de la setlist sans libellé
  court (T5) ; bouton « Voir » des inscriptions à 36 px (T1) ; en deux volets, pas de retour vers l'équipe dans la fiche
  d'une tâche (T6). Mise en ligne sur `main` : attend son ordre.
- 12/11/2026 : **points à trancher réglés** (Timothée : « fais ce qui est le mieux »). Faits : feuille de choix d'un
  nom (`ChoisirNom.tsx`) en lignes de 44 px au lieu de 40 (mesuré dans `retouches-usage-t3`) ; « Voir » des
  inscriptions en `TOUCHER_44`, dessin de 36 px inchangé ; en deux volets, une tâche ouverte depuis son équipe porte
  « ‹ DA » au-dessus du titre (`retouches-usage-t6` le vérifie désormais sur tous les écrans), et le sous-titre de
  l'équipe disparaît quand le retour la nomme déjà (un volet compris). Gardés tels quels : les 12 px entre les lignes
  des cartes du planning (sans eux les zones se recouvrent) ; la flèche seule du retour de la setlist (neuf commandes
  sur une ligne au téléphone, convention connue, nom accessible présent) ; les pastilles du Sommaire (séparer les zones
  demanderait 26 px entre rangées ; un toucher entre deux rangées ouvre déjà une pastille voisine). Passe : t1, t3, t6,
  `bilingue-b5`, `agencement-v18-taches`, `planning-grille`, `equipes-page`, `taches` : tout vert (un rouge instable
  de t1, les tonalités au téléphone, vert trois fois sur trois seul).
