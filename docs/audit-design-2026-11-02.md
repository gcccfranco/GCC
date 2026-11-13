# Audit du design — 02/11/2026

**Demande** (Timothée, 02/11/2026) : « la DA est correcte, mais j'aimerais un audit du design du site pour voir ce qui
va et ce qui ne va pas ». On juge l'**exécution** de la direction actuelle, pas une nouvelle direction.

**Méthode** : 314 captures (21 écrans × français clair, français sombre, interface 中文 × téléphone, tablette portrait,
tablette paysage, ordinateur 1 280, ordinateur 1 440 ; outil : `tests/audit-design-captures.spec.ts`), données et
comptes fictifs. Équipe design (`docs/orchestration.md` § 4), workflow en quatre temps : `regard` trie les captures
d'un groupe de pages, `critique-design` l'audite (captures et code), `relecteur` cherche à réfuter chaque constat,
`directeur-artistique` donne l'avis d'ensemble. 101 constats rendus : 2 réfutés, 28 restés incertains (le relecteur
n'a pas pu les trancher), 71 confirmés, ramenés à **93** après fusion des doublons (le même défaut vu sur six groupes
de pages compte une fois). Les trois défauts les plus graves ont été revus à l'œil par la conversation principale.

**Verdict** : la direction tient. Le site a une vraie identité là où il parle musique (code couleur des sections,
français et chinois côte à côte, titres chinois en KaiTi, mode louange dépouillé), un sombre propre et une interface
chinoise qui ne casse nulle part. Ce qui ne va pas tient en deux familles : **six défauts visibles au premier coup
d'œil**, tous petits à corriger, et une **dérive d'exécution** dans les pages de gestion (cinq façons de choisir dans
une liste, trois recettes de carte, plus de 700 tailles de texte écrites à la main), qui explique le reste de « fade ».

## 1. Ce qui va (à préserver)

- **Le code couleur des sections** (I, C1, R, Pm, C2, P ; encadrés teintés, refrain orange) : le vocabulaire d'un
  musicien, cohérent de la page chant à la setlist, à l'éditeur et au mode louange.
- **Français et chinois côte à côte** dès la liste : pastille de ton bleue pour un chant français, rouge pour un chant
  chinois, pinyin gris sous le titre. L'idée la plus propre à ce site, tenue sur toutes les dispositions.
- **Les titres chinois en KaiTi**, avec le pinyin dessous : un recueil de cantiques, pas une page web.
- **L'encre comme couleur d'action** : boutons pleins, onglet actif en pastille noire ; le rouge du logo réservé à la
  marque, le bleu aux accords. Pas de « crème + terracotta », pas de dégradé violet, pas d'émoji, pas de Title Case.
- **La barre d'onglets flottante** du téléphone et de la tablette : l'état actif est sans ambiguïté, en clair comme
  en sombre.
- **Le mode louange** : presque aucun habillage, blocs de section à bordure nette, accords lisibles de loin, deux
  colonnes sur ordinateur.
- **Le sombre**, entièrement relié aux jetons : mêmes hiérarchies qu'en clair, couleurs de service éclaircies,
  contrastes du texte secondaire corrects (environ 5:1 en clair, 6:1 en sombre).
- **L'interface 中文** ne casse nulle part (liste, statistiques, chant, évènements, back-office) ; en chinois, le
  sélecteur d'espace tient là où le français déborde.
- **Les états vides** rédigés (« Aucun service à venir », « Personne pour l'instant ») et **les cibles tactiles**
  de la barre d'outils du chant, des accords et des pilules de planning (44 px, ou 40 px avec zone élargie).

## 2. Ce qui ne va pas, au premier coup d'œil (six défauts, tous petits)

| # | Défaut | Où | Correction |
|---|---|---|---|
| chants-1 | « Back-Office » coupé (« Back-Offic ») dans le sélecteur App / Musiciens / Back-Office | barre latérale dépliée, 1 280 et 1 440 px, français | segments plus serrés (`px-2.5`) et `min-w-0`, `SelecteurEspace.tsx` |
| back-office-1 | La cloche déborde du bord droit de l'écran | téléphone, Back-Office en français | même sélecteur, trop large à côté de deux boutons ronds |
| dimanche-1 | Le titre du chant, en grand, transparaît sous la barre du haut du mode louange (« HOSANNA / Hillsong » pâle sous « Hosanna D ») | mode louange, toutes dispositions | barre opaque ou titre de scène masqué sous la barre ; à revoir en direct |
| chants-2 | Barre d'outils du chant à 6 px des bords, la page à 16 px | téléphone | `px-1.5` → `px-4`, `SongDetailClient.tsx:347` et `:434` |
| quotidien-1 | Planning en grand écran : la colonne de droite reste vide sans service à venir | ordinateur, tablette paysage | un état vide dans la colonne, ou une colonne qui disparaît |
| eglise-5 | Les captures du guide restent en français dans l'interface chinoise | guide, 中文 | captures chinoises du guide (gros : refaire les images) |

## 3. La dérive d'exécution (avis du directeur artistique)

Les pages musicales sont construites avec les mêmes pièces ; les pages de gestion non.

- **Cinq façons de choisir dans une liste** : segmenté (Setlists, Mes services, Harmonie), pastilles noires
  (« Tout / Mes équipes »), menu gris plein (« Tous les thèmes »), menu à contour (Statistiques, éditeur), menu natif
  du navigateur (« Toutes » dans Setlists). Statistiques en cumule trois sur un écran.
- **Trois recettes de carte** : blanc à ombre douce (App), filet d'1 px sans ombre (À faire), carte bordée dans une
  carte (Mes services).
- **Des barres d'outils qui ne parlent pas la même langue** : huit commandes avant le titre sur la page chant au
  téléphone ; icône sur libellé, texte seul ou icône seule selon la disposition sur la setlist ; « Louange » ici,
  « Mode Louange » là.
- **Typographie hors échelle** : six tailles dans `tailwind.config.ts`, plus de 700 tailles écrites à la main à côté
  (`text-[13px]` 245 fois, `[15px]` 140, `[11px]` 100, et des 12,5 / 13,5 / 14,5 px) ; beaucoup de gris en 10–11 px
  sur grand écran.
- **Rayons et ombres qui dérivent** : neuf rayons écrits à la main en plus de l'échelle ; `--shadow-soft` vaut
  `transparent` mais sert 23 fois.
- **Largeurs sans règle** sur grand écran : Planning sur environ 590 px avec un tiers d'écran vide, Statistiques en
  pleine largeur, Mes services sur environ 670 px.
- **Ce qui reste « fade »** : blanc sur blanc que seules des ombres séparent (l'accueil au téléphone est une pile de
  cartes blanches identiques), le couple « grand titre + sous-titre gris » qui décrit la page au lieu d'informer, le
  verset du planning en italique gris sur aplat gris.
- **Petits tics « IA »** : halos décoratifs (connexion, halo gris par défaut, ellipse pêche du chant sur ordinateur),
  chaînes à points médians partout, tirets cadratins et flèches dans les libellés.

## 4. Chantiers proposés, du plus rentable au moins rentable

1. **Corrections immédiates** (une tranche, sans planche) : les six défauts du § 2 sauf les captures chinoises du
   guide, plus les constats confirmés de gravité « à regarder de près » (27, dont 19 d'effort petit : état actif des boutons Accords et Pinyin, contraste du ton choisi en sombre dans l'éditeur, cibles de
   36 px, bannière des rappels, sections de l'éditeur restées en français en 中文…).
2. **Une seule recette de surface** : fond de groupe gris clair, groupes blancs sans ombre, ombre réservée à ce qui
   flotte (barre d'onglets, menus, feuilles), une seule carte, halo seulement quand il porte une couleur de service ou
   de section. C'est ce qui retire le plus de fadeur. Ça change l'aspect : **planche d'abord** (`/planche`).
3. **Quatre contrôles et pas un de plus** : segmenté pour 2 à 4 vues, pastille filtre, un seul menu déroulant (plus
   aucun `<select>` natif visible), une barre d'outils par objet avec les mêmes libellés partout. Trois primitives dans
   `src/components/ui/`, puis 10 à 15 pages.
4. **Échelle typographique et largeurs** : ramener les tailles aux six crans, plancher à 13 px sur grand écran, une
   règle de largeur (colonne d'environ 720 px pour la gestion, pleine largeur pour les grilles). Mécanique, environ 80
   fichiers.

## 5. Questions à trancher

- **Titres de chants en capitales** (ABBA PÈRE) quand tout le reste est en casse normale ? Proposition : casse
  normale en latin, KaiTi gardé pour le chinois.
- **Fond de groupe gris en clair** (chantier 2) ? Proposition : oui, après une planche aux quatre dispositions.
- **Halos** : seulement en couleur de service ou de section ? Proposition : oui, retirer celui de la connexion et le
  halo gris par défaut.
- **Contenu d'Harmonie et captures du guide en chinois** : à traduire, ou assumé en français ?

## 5 bis. Préférences provisoires de Timothée (03/11/2026)

**Pas une validation** : Timothée validera après avoir vu toutes les planches, y compris celles des 55 pages
restantes. Premières préférences sur les planches de corrections (`docs/planches/planche-corrections-*.html`) :
- **Recette de surface : C**, fond de groupe gris clair (`#f2f2f7`) sur les pages de liste et de gestion, groupes
  blancs sans ombre, pages de lecture blanches.
- **Contrôles de choix : B**, trois contrôles (rail segmenté, pastille filtre, un seul menu déroulant).
- **Titres de chants : C**, casse normale sur la page chant, capitales gardées en mode louange ; PDF inchangé.
- **Halos : B**, seulement ceux qui portent une couleur de service ou de section.

Restent à voir puis à trancher : l'échelle typographique, le contenu chinois (guide, Harmonie), les choix constat par constat et
l'ordre de livraison. Rien de codé : chaque tranche attend son go.

## 6. Limites

- Captures statiques : ni mouvement, ni survol, ni menus ou feuilles ouverts.
- Captures pleine page : barres fixes placées au hasard dans l'image ; les constats qui en venaient ont été réfutés
  ou laissés incertains.
- Compte administrateur seulement ; un membre simple voit moins de choses.
- Les captures ne sont pas versées au dépôt (elles montrent l'adresse du compte de test). Pour les refaire :
  `PW_CAPTURES=<dossier> npx playwright test -c playwright.audit-design.config.ts`.

## 7. Tous les constats (93)

Classés par groupe de pages, confirmés d'abord, du plus visible au moins visible. *Incertain* : le relecteur n'a pu ni
confirmer ni réfuter ; à regarder avant de corriger. Les chemins de preuve sont relatifs au dossier des captures.

### Partout

- **chants-1** — « Back-Office » coupé (« Back-Offic ») dans le sélecteur App / Musiciens / Back-Office de la barre latérale (visible au premier coup d'œil, effort petit)  
  Toutes les pages à barre latérale dépliée · ordinateur 1280 et ordinateur 1440 (barre de 248 px) · français clair et sombre ; en 中文 (应用 / 乐手 / 后台) tout tient, seul le français déborde.  
  *Correction* : Réduire le remplissage des segments (px-2.5) ou le corps à 12 px et laisser les segments se partager la largeur (min-w-0) pour que les trois libellés français tiennent dans 220 px.  
  *Preuve* : ordinateur-1440/chants-fr-clair.png : en haut à gauche sous le logo, le segment « Back-Office » est tranché par le bord de la barre (x ≈ 177 à 248, y ≈ 84) ; même chose sur ordinateur/chants-fr-clair.png, ordinateur/statistiques-fr-clair.png et chant-fr-fr-clair. Code : src/components/layout/SelecteurEspace.tsx (segments en whitespace-nowrap avec px-3.5, conteneur shrink-0) dans une barre de 248 px (src/app/globals.css:476), soit 220 px utiles pour trois libellés.
- **chants-7** — Barre réduite : l'icône du mode Musiciens et l'entrée Chants sont la même note de musique (à regarder de près, effort petit)  
  Toutes les pages à barre réduite · tablette paysage ; ordinateur avec barre repliée · clair (le sombre n'a pas été comparé).  
  *Correction* : Donner au mode Musiciens une icône propre (guitare, micro ou clavier) pour qu'aucune entrée de navigation ne la répète.  
  *Preuve* : tablette-paysage/statistiques-fr-clair.png : bloc de trois icônes en haut (maison, note, bouclier) puis, plus bas, l'entrée Chants active (note blanche sur noir) : deux notes identiques, l'une pour un espace, l'autre pour une page. Code : src/components/layout/SelecteurEspace.tsx (icones : musiciens = Music).

### Chants

- **chants-2** — Barre d'outils du chant à 6 px des bords alors que la page a 16 px de gouttière (visible au premier coup d'œil, effort petit)  
  Chant FR et Chant ZH · téléphone (la tablette portrait a plus d'air) · clair, sombre, zh : identique.  
  *Correction* : Passer les deux rangées d'outils de px-1.5 à px-4 pour les aligner sur la gouttière du texte et de la cloche (la 2e rangée peut garder son défilement).  
  *Preuve* : telephone/chant-fr-fr-clair.png, haut de page (y ≈ 175 à 280 sur 1082 px de large) : le bouton retour est à 16 px du bord gauche de l'image (≈ 6 px CSS) et la capsule « A− A+ ♫ » finit à x = 1066 de 1082, alors que le titre « ABBA PÈRE » est à x = 42 et la cloche juste au-dessus à x = 1040. Idem sur la 2e rangée (Vidéo, PDF). Code : src/app/songs/[slug]/SongDetailClient.tsx:347 et :434 (px-1.5) contre :456 (px-4).
- **chants-3** — Les boutons Accords et Pinyin ne montrent presque pas leur état actif et ne le disent pas aux lecteurs d'écran (à regarder de près, effort petit)  
  Chant FR et Chant ZH · téléphone surtout (icône seule) ; moins net sur tablette et ordinateur · clair : blanc sur blanc ; sombre : gris sur gris très proche.  
  *Correction* : Donner à l'état actif un fond d'encre ou de la teinte primaire avec texte inversé, comme le segment « 简谱 / Paroles » juste dessous, et ajouter aria-pressed sur les deux boutons.  
  *Preuve* : telephone/chant-zh-fr-clair.png, haut : la note ♫ et le « 拼 » dans la capsule ne se distinguent de l'état éteint que par un très léger cercle (fond bg-card sur une capsule claire). Code : src/app/songs/[slug]/SongDetailClient.tsx:394-402 et :411-419, actif = « bg-card text-foreground shadow-sm », aucun aria-pressed dans le fichier.
- **chants-4** — Le sélecteur de ton affiche une lettre nue, collée à « A− A+ » qui règlent la taille du texte (à regarder de près, effort petit)  
  Chant FR et Chant ZH · téléphone et tablette portrait (« A (orig.) » ou « E (原调) » dès la tablette paysage) · clair, sombre, zh.  
  *Correction* : Préfixer la lettre d'un mot court (« Ton A ») ou d'un symbole de tonalité, et garder « (orig.) » sous forme de point sur téléphone.  
  *Preuve* : telephone/chant-fr-fr-clair.png, y ≈ 225 : « − A ⌄ + » puis « A− A+ ♫ » sur la même ligne ; pour un chant en la, on lit trois « A » de sens différents sans libellé. Même chose avec « E » dans chant-zh-fr-clair.png.
- **chants-5** — Le bouton Statistiques de la liste est un rond de 36 px sans libellé sur téléphone (à regarder de près, effort petit)  
  Chants (liste) · téléphone (sur tablette et ordinateur il s'appelle « Statistiques » avec son texte) · fr et zh clair/sombre ; en zh le filtre de thèmes passe sur la ligne des langues alors qu'en français il a sa propre ligne : la composition varie avec la longueur des libellés.  
  *Correction* : Porter la cible à 44 px (size-11 ou un ::after de 44 px comme les autres boutons) et ajouter le libellé « Statistiques » quand il y a la place.  
  *Preuve* : telephone/chants-fr-clair.png, ligne « 383 chants » (y ≈ 815 à 905 sur 1082 px de large, soit ≈ 36 px CSS) ; même rond sur chants-zh-clair.png. Code : src/components/songs/BoutonStatistiques.tsx:14 (size-9 = 36 px, sans zone de toucher agrandie).
- **chants-6** — Statistiques : la rangée de périodes est coupée au bord sans indice de défilement, et un filtre reste seul sur la 2e ligne (à regarder de près, effort petit)  
  Statistiques · téléphone (période coupée) ; téléphone, tablette portrait et ordinateur 1280 (filtre orphelin) ; seul le 1 440 px tient en une ligne · fr et zh ; en zh « 自选日期 » devient « 自选日 », en fr « Dates libres » est entièrement hors écran.  
  *Correction* : Appliquer le fondu latéral existant à la rangée de pastilles pour montrer qu'elle défile, et regrouper les trois listes déroulantes dans leur propre ligne pour éviter l'orphelin.  
  *Preuve* : telephone/statistiques-zh-clair.png (y ≈ 600 à 700) et telephone/statistiques-fr-clair.png (« Depuis le début » touche le bord droit) ; orphelin « Toutes les présidences » seul en 2e ligne sur tablette/statistiques-fr-clair.png et tablette-paysage/statistiques-fr-clair.png. Code : src/components/layout/Onglets.tsx:178 (défilement horizontal, barre masquée, sans le fondu de bord que le projet a déjà dans src/hooks/useFonduLateral.ts, utilisé en SongListClient.tsx:175 et SectionTabs.tsx:39) ; src/app/songs/statistiques/StatistiquesClient.tsx:381-384.
- **chants-8** — Bord droit incohérent : le volet du chant dépasse de 24 px les actions de l'en-tête (à regarder de près, effort petit)  
  Chant FR et Chant ZH (volets) ; Chants (liste) en colonne unique · ordinateur 1280 et 1440 ; tablette portrait et paysage pour la liste · clair, sombre, zh.  
  *Correction* : Donner au volet du chant la même marge droite (--marge-page) que « Choisis un chant », et aligner les actions d'en-tête sur la colonne de liste (rail A–Z posé dans la marge).  
  *Preuve* : ordinateur-1440/chant-fr-fr-clair.png : « Proposer un chant » finit à x = 1400, alors que les cartes de sections et la pastille « A » finissent à x = 1424 ; sur la page d'accueil de la liste les cartes finissent bien à 1400 (chants-fr-clair.png). Sur tablette, les boutons d'en-tête dépassent la recherche et la liste d'environ 28 px à cause du rail A–Z (tablette/chants-fr-clair.png, en haut). Code : src/app/songs/ChoisisUnChant.tsx:141 porte pr-[var(--marge-page)], pas le volet du chant.
- **chants-9** — Page d'accueil des chants : une carte de 216 px à côté d'une section pleine largeur, pastilles de ton à 650 px des titres (finition, effort petit)  
  Chants (volet droit « Choisis un chant ») · ordinateur 1280 et 1440 · clair, sombre, zh.  
  *Correction* : Plafonner la largeur de « Nouveaux au répertoire » (ou la mettre en deux colonnes) et laisser une carte seule prendre une largeur lisible.  
  *Preuve* : ordinateur-1440/chants-fr-clair.png : « Culte Francophone » en carte de ≈ 220 px (x 712 à 931) avec le vide à droite, puis « Nouveaux au répertoire » sur toute la largeur (x 712 à 1400) avec les pastilles de ton à l'extrême droite, loin des titres. Code : src/app/songs/ChoisisUnChant.tsx:154 (auto-fill minmax(216px, 1fr)) et :194 ; avec une seule setlist, la carte occupe un tiers.
- **chants-10** — Ligne de tempo du chant : 11 px gris clair et grand trou entre ♩ et « = 92 » (finition, effort petit)  
  Chant ZH et Chant FR avec tempo · téléphone, tablette, ordinateur · clair, sombre, zh.  
  *Correction* : Régler le ♩ à la taille du texte voisin et passer la ligne à 12 px avec une teinte au moins foreground/70.  
  *Preuve* : telephone/chant-zh-fr-clair.png, sous la pastille « E » (y ≈ 570) : « 1=E · 4/4 · ♩    = 92 », le ♩ est séparé du chiffre par un blanc anormal ; le texte est le plus petit et le plus pâle de l'en-tête. Code : src/components/song/SongView.tsx:785 (♩ en 15 px dans un conteneur à 11 px) et :835 (text-[11px] text-muted-foreground).
- **chants-14** — Statistiques : l'état vide est fondu dans le fond et n'offre aucune piste (finition, effort petit)  
  Statistiques · toutes · clair surtout (la carte se distingue peu du dégradé gris).  
  *Correction* : Ajouter une action « Élargir à depuis le début » dans la carte vide et renforcer légèrement son contraste de bord.  
  *Preuve* : tablette-paysage/statistiques-fr-clair.png : la carte « Aucune setlist publiée sur cette période. » (x 178 à 1948, y 530 à 680) est blanc sur gris très clair et ne propose ni « Depuis le début » ni retour ; elle suit deux rangées de filtres. Seul l'état vide a été capturé : la vraie liste des chants joués n'est pas auditée.
- **chants-11** — En-tête du chant chinois : quatre lignes grises de 13 px dans trois polices, sans hiérarchie entre elles (finition, effort moyen · *incertain*)  
  Chant ZH · téléphone, tablette, ordinateur · fr, zh clair/sombre.  
  *Correction* : Garder le pinyin juste sous le titre, passer le titre latin en corps de sous-titre plus foncé et l'auteur en tête de ligne secondaire plus petite.  
  *Preuve* : telephone/chant-zh-fr-clair.png, y ≈ 540 à 710 : pinyin, titre latin « S'gala Puji Syukur » et « Niko … / 蒋忠译 » empilés avec le même gris, la même taille, des faces différentes ; la liste affiche les mêmes titres en sans-serif gras. Code : src/components/song/SongView.tsx:795-820 (KaiTi, pinyin_font, zh_lyric_font). À confirmer comme voulu avant d'y toucher.  
  *Contre-vérification* : Le code montre bien pinyin, sous-titre et artiste à 13 px muted dans trois polices. Le constat dit lui-même « à confirmer comme voulu ». Je n'ai pas relu la capture ZH, et la hiérarchie typographique relève du jugement. Je ne le confirme pas.
- **chants-15** — Petits traits perdus au-dessus de la première ligne du scan 简谱 (gelé, effort petit · *incertain*)  
  Chant ZH avec 简谱 · ordinateur 1440, tablette, tablette paysage · clair, sombre.  
  *Correction* : Aucune proposition (zone gelée : intérieur du calque 简谱).  
  *Preuve* : ordinateur-1440/chant-zh-fr-clair.png (deux traits à x ≈ 1293 et 1345, y ≈ 353) ; idem tablette/chant-zh-fr-clair.png (y ≈ 690). L'intérieur du calque 简谱 est gelé.  
  *Contre-vérification* : Je n'ai pas ouvert les captures ZH du scan 简谱. Le constat se rapporte de toute façon à l'intérieur du calque 简谱, zone gelée, donc à noter « gelé » sans action.

### Le dimanche (setlists, mode louange)

- **dimanche-1** — Mode louange : le titre du chant, en grand, transparaît sous la barre du haut (visible au premier coup d'œil, effort petit)  
  Mode louange · les cinq (téléphone, tablette portrait, tablette paysage, ordinateur 1 280, ordinateur 1 440) ; plus net sur téléphone et tablette portrait · fr-clair, fr-sombre, zh-clair (le « HOSANNA / Hillsong » reste en français, c'est le titre du chant).  
  *Correction* : Faire commencer la page sous la barre (l'en-tête du chant y est caché par un décalage de défilement ou de hauteur de barre) ou, à défaut, rendre la barre du haut du mode louange opaque : un titre fantôme sur l'écran que le musicien regarde le plus lit comme un bogue.  
  *Preuve* : telephone/mode-louange-fr-clair.png, en haut à gauche (y≈45 à 130) : « HOSANNA » en capitales géantes et « Hillsong » pâles sous « Hosanna D ». À droite, derrière « 1 / 6 », une pastille ronde et une forme de bouton pâles : ce sont le numéro « 1 » et la pastille de tonalité de l'en-tête du chant. Même chose sur tablette/mode-louange-fr-clair.png (y≈40 à 100). Code : src/components/performance/BarreHaut.tsx:38 (classe material-steady) ; src/app/globals.css:19-24 (fond à 80 % d'opacité plus flou, ce qui laisse passer ce qui est dessous).
- **dimanche-3** — Éditeur, tonalité choisie en sombre : lettre blanche sur bleu clair, contraste d'environ 1,8 contre 1 (à regarder de près, effort petit)  
  Édition de setlist, rangée « Tonalité » · ordinateur 1 280, ordinateur 1 440, tablette paysage · fr-sombre (en clair la même pastille est un bleu franc à lettre blanche, lisible).  
  *Correction* : En sombre, mettre une lettre sombre (par exemple #0b1220) sur la pastille de tonalité active, ou garder un bleu moyen comme en clair.  
  *Preuve* : ordinateur-1440/setlist-edition-fr-sombre.png, pastille « D » à x≈914, y≈181. Mesure sur l'image : fond (171,193,245), lettre (255,255,255), soit environ 1,8 contre 1, sous le seuil de 4,5. Comparer avec ordinateur/setlist-edition-fr-clair.png, fond (59,93,195). La bascule est le jeton « actif » sombre, un bleu clair associé à une lettre restée blanche.
- **dimanche-5** — Éditeur en 中文 : les noms de section restent en français (Intro, Couplet 1, Refrain, Couplet 2, Pont) (à regarder de près, effort moyen)  
  Édition de setlist, volet « Réglages du chant » · ordinateur 1 280, ordinateur 1 440, tablette paysage · zh-clair ; la page de lecture et le mode louange 中文 traduisent les mêmes sections (前奏, 主歌 1, 副歌, 桥段).  
  *Correction* : Passer ces noms par la même table de libellés que la lecture et le mode louange (clé d'après le type de section), en gardant le nom stocké pour les sections personnalisées.  
  *Preuve* : ordinateur/setlist-edition-zh-clair.png : sous « 结构 » les boutons « + Intro », « + Couplet 1 », « + Refrain »…, le tableau « 各段落 » aux lignes « Intro / Couplet 1 / Refrain / Couplet 2 / Pont », et le sous-titre « Hillsong · Intro, Couplet 1, Refrain, Couplet 2, Pont ». Code : src/components/setlists/editeur/Reglages.tsx:279-283 et :379-380, qui affichent item.name / s.name, le nom stocké dans les données, sans passer par les libellés de langue.
- **dimanche-7** — À 1 440 px, l'en-tête de page ne s'aligne pas sur la colonne de lecture qu'il surplombe (à regarder de près, effort moyen)  
  Setlists (liste), Setlist (lecture) · ordinateur 1 440 ; le 1 280 s'aligne · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Mettre l'en-tête dans le même conteneur de 960 px que la colonne seule quand elle est affichée, ou élargir cette colonne à celle de l'en-tête.  
  *Preuve* : ordinateur-1440/setlists-fr-clair.png : « Setlists » à x≈288 et « Nouvelle setlist » collé au bord (x≈1 232 à 1 400), alors que la carte est centrée de x≈364 à 1 324. Page setlist, ordinateur-1440/setlist-fr-clair.png (recadrée sur y 0 à 560) : les boutons « Adapter … Mode Louange » finissent à x≈1 412, la colonne de lecture à x≈1 328. Code : src/components/layout/DeuxVolets.tsx:45 et :96 (colonne seule de 960 px centrée) alors que l'en-tête de page prend toute la largeur.
- **dimanche-8** — Liste des setlists en tablette portrait : une carte à moitié de largeur, collée à gauche, avec un aperçu que les autres dispositions n'ont pas (à regarder de près, effort petit)  
  Setlists · tablette portrait seulement (810 px) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Ne passer en deux colonnes qu'à partir de deux setlists (ou grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] pour qu'une carte seule s'étire), et garder le même contenu de carte sur les quatre dispositions.  
  *Preuve* : tablette/setlists-fr-clair.png : carte de x≈40 à 645 sur 1 317, moitié droite vide, trois chants listés avec leur tonalité. Les autres dispositions montrent une simple ligne sans aperçu (telephone/setlists-fr-clair.png ; ordinateur-1440/setlists-fr-clair.png). Code : src/app/setlists/page.tsx:560-561, grid grid-cols-2 items-start.
- **dimanche-9** — Page setlist en tablette portrait : la barre d'outils va de bord à bord, le contenu est resserré au centre (à regarder de près, effort petit)  
  Setlist (lecture) · tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Donner à la barre d'outils la même largeur maximale que le contenu en dessous (max-w-2xl) en tablette portrait.  
  *Preuve* : tablette/setlist-fr-clair.png : barre de x≈25 à 1 235 (retour à gauche, « Louange » et « … » à droite), titre et liste de x≈133 à 1 128. Code : src/app/setlists/[id]/SetlistDetailClient.tsx:1742 (barre en max-w-[1080px]) contre :1902 (contenu en max-w-2xl, 672 px).
- **dimanche-11** — Mode louange en tablette paysage : la pastille « Ensuite : Abba Père · A » recouvre le coin bas du bloc Pont (à regarder de près, effort moyen)  
  Mode louange · tablette paysage ; libre à 1 280 et 1 440 px · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Réserver la hauteur de la pastille (≈ 56 px) dans le budget de la dernière page d'un chant, comme le fait la bande d'aperçu.  
  *Preuve* : tablette-paysage/mode-louange-fr-clair.png, pastille de x≈835 à 1 165, y≈1 215 à 1 290 : la bordure basse du bloc « Pont » (y≈1 245) passe derrière elle. Code : src/components/performance/PerformanceMode.tsx:1254-1270, pastille posée en absolu par-dessus la page (bg-background/85), sans réserver sa hauteur dans la pagination.
- **dimanche-13** — Mode louange sur téléphone : des lignes de paroles qui passent à la ligne laissent un trou et des mots orphelins (à regarder de près, effort gros)  
  Mode louange · téléphone · fr-clair, fr-sombre, zh-clair.  
  *Correction* : À la coupure, répartir la ligne en deux moitiés d'accords et paroles qui se suivent sans rangée vide, et ne pas laisser un seul mot après le retour à la ligne (réduire le corps d'un cran avant de couper).  
  *Preuve* : telephone/mode-louange-fr-clair.png : « nuées. » (y≈695) et « péchés. » (y≈952) tombent seuls sous une ligne vide laissée par la rangée d'accords ; « Seigneur. » (y≈1 349 et 1 518) passe sous « hosanna à Toi », avec sa propre rangée d'accords. Même motif en sombre (telephone/mode-louange-fr-sombre.png).
- **dimanche-14** — Mode louange, bloc Pont : la rangée d'accords « Bm7 D Em7 F#m7 » colle à la rangée suivante « G … A » (finition, effort petit)  
  Mode louange · tablette paysage, ordinateur 1 440 (partout où le Pont est affiché) · fr-clair, fr-sombre, zh-clair (桥段).  
  *Correction* : Quand une rangée d'accords sans paroles précède une ligne avec paroles, lui donner la marge d'une ligne de paroles (ou la séparer d'un filet léger).  
  *Preuve* : tablette-paysage/mode-louange-fr-clair.png, y≈750 et 780 : deux rangées d'accords séparées de 30 px, alors que chaque ligne accords + paroles suivante a un pas de 76 px ; elles se lisent comme une seule rangée. Aussi ordinateur-1440/mode-louange-zh-clair.png (y≈405 et 421).
- **dimanche-15** — Page setlist sur téléphone : les libellés des commandes du haut touchent les bords de leurs pastilles (finition, effort petit)  
  Setlist (lecture) · téléphone · fr-clair, fr-sombre ; zh-clair respire (libellés plus courts).  
  *Correction* : Passer à px-2 et laisser la rangée défiler horizontalement, ou ne garder que l'icône pour les commandes secondaires (Adapter, Ma version) comme en tablette paysage.  
  *Preuve* : telephone/setlist-fr-clair.png, y≈130 à 200 : « Affichage », « Adapter », « Accords », « Ma version » et « Louange » presque sans marge latérale (x≈111 à 199 pour « Affichage », x≈598 à 678 pour « Louange »). Code : src/app/setlists/[id]/SetlistDetailClient.tsx:99-100 (PILULE_EMPILEE : px-1 ; LIBELLE_COURT : texte de 10 px).
- **dimanche-21** — Filtres « Sélectionner » et « Toutes » presque sans fond ni bord sur la carte claire (finition, effort petit)  
  Setlists · ordinateur 1 280, ordinateur 1 440 · fr-clair ; lisibles en fr-sombre et sur téléphone.  
  *Correction* : Donner à ces deux commandes une bordure fine ou un gris plus marqué, et limiter la largeur du menu « Toutes » à celle de son libellé.  
  *Preuve* : ordinateur-1440/setlists-fr-clair.png, y≈250 : « Sélectionner » (x≈520 à 612) et « Toutes » (x≈640 à 1 307) ont un gris à peine plus foncé que la carte blanche, contre la puce noire « Mes services » juste à côté. Le menu « Toutes » s'étire sur toute la largeur.
- **dimanche-24** — Mode louange : la glissière n'a ni étiquette ni valeur, et la flèche « ‹ » désactivée disparaît (finition, effort petit)  
  Mode louange · toutes · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Ajouter une étiquette courte au bord de la glissière (par exemple « Chants » ou « Pages ») et garder la flèche désactivée à 40 % d'opacité avec sa bordure.  
  *Preuve* : telephone/mode-louange-fr-clair.png, y≈1 780 à 1 840 : trois graduations et un curseur noir à gauche, sans indication de ce qu'ils règlent ; en bas à droite (x≈668, y≈1 923) le « ‹ » grisé presque invisible. Même constat en sombre et à 1 440 px (ordinateur-1440/mode-louange-zh-clair.png, y≈810 et 867).
- **dimanche-25** — Onglet « Mes setlists » : l'icône cadenas n'apparaît qu'à partir de la tablette (finition, effort petit)  
  Setlists · téléphone sans cadenas ; tablette, ordinateur avec cadenas · fr-clair, zh-clair.  
  *Correction* : Garder le cadenas sur téléphone (14 px, l'espace existe) ou le retirer partout.  
  *Preuve* : telephone/setlists-fr-clair.png, y≈350 : « Mes setlists » seul ; tablette/setlists-fr-clair.png, y≈292 : cadenas à gauche. Code : src/app/setlists/page.tsx:434 (hidden sm:block).
- **dimanche-26** — Le mot « Louange » du logo texte est rose pâle en clair et rouge sombre en sombre en tablette portrait (gelé, effort petit)  
  Setlists, Setlist, Édition (barre du haut) · tablette portrait seulement ; rouge franc à 1 280 et 1 440 px · fr-clair, fr-sombre.  
  *Correction* : Aucune proposition : logo et label contextuel de la navbar sont gelés ; à confirmer en regardant l'animation (voir non vérifié).  
  *Preuve* : tablette/setlists-fr-clair.png, x≈168 à 282, y≈45 : « Louange » rose très pâle ; tablette/setlists-fr-sombre.png : rouge sombre sur fond noir. Les autres dispositions le montrent en rouge franc. Cela ressemble au label contextuel animé de la navbar, saisi en cours de fondu.
- **dimanche-4** — Éditeur : « Notes pour l'équipe » est coupé au milieu d'un mot (à regarder de près, effort petit · *incertain*)  
  Édition de setlist · ordinateur 1 280 (volet gauche de 400 px), tablette paysage ; ordinateur 1 440 tient tout juste · fr-clair, fr-sombre ; en zh-clair la phrase entière passe (libellé « 给团队的备注 » plus court) ; téléphone et tablette portrait : la phrase passe.  
  *Correction* : Remplacer l'input par un textarea qui se déploie sur deux lignes (field-sizing:content) ou mettre le libellé au-dessus du champ quand la colonne est étroite.  
  *Preuve* : ordinateur/setlist-edition-fr-clair.png, y≈375 : « Intro douce, enchaîner sans pa » ; tablette-paysage/setlist-edition-fr-clair.png, y≈693 : « …sans pa » coupé. Code : src/components/setlists/editeur/EnTeteEditeur.tsx:344-352, un <input type=text> sur une ligne, avec le libellé « Notes pour l'équipe : » qui garde sa place.  
  *Contre-vérification* : Le code (EnTeteEditeur.tsx:344) confirme un input sur une ligne avec un libellé qui garde sa place, donc une coupure est possible. Je n'ai pas ouvert les captures citées, la coupure « sans pa » n'est pas vérifiée.
- **dimanche-10** — Mode louange en tablette portrait : un trait violet dépasse au-dessus de la glissière et une grande plage vide le précède (à regarder de près, effort moyen · *incertain*)  
  Mode louange · tablette portrait ; plus discret sur téléphone (≈70 px vides sans trait) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Soit afficher l'aperçu en entier au-dessus de la barre du bas (la bande est conçue pour cela), soit le masquer tout à fait quand il ne tient pas, au lieu d'un trait orphelin ; le vide de 330 px montre que la page suivante aurait pu tenir plus haut.  
  *Preuve* : tablette/mode-louange-fr-clair.png : sous « Couplet 2 » (y≈1 460) un vide d'environ 330 px, puis un trait violet épais à y≈1 795 qui est le haut du bloc « Pont ». Code : src/components/performance/PerformanceMode.tsx:~1032 et la constante APERCU_H = 96 (bande d'aperçu du début de la page suivante « sous une ligne bleue de 2 px ») : la bande prévue est recouverte par la barre du bas et il n'en reste que le trait.  
  *Contre-vérification* : Capture tablette non ouverte. Le code prévoit une bande d'aperçu (APERCU_H=96, rogneBas). Je ne peux pas confirmer le trait orphelin ni le vide de 330 px.
- **dimanche-19** — Mode louange sur téléphone : les pastilles de section (I, C1, R, C2, P) font environ 32 px, sous les 44 px tactiles (à regarder de près, effort petit · *incertain*)  
  Mode louange · téléphone ; 43 px en tablette · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Garder le dessin à 30 px mais étendre la cible tactile à 44 px (zone cliquable par ::after, comme le fait le sélecteur d'espace).  
  *Preuve* : telephone/mode-louange-fr-clair.png, y≈170 à 247 : pastilles d'environ 83 px sur une capture de 1 082 px de large. Avec la densité de pixels d'un Pixel 7 (2,625), cela fait environ 32 px CSS. Code : src/components/performance/PerformanceMode.tsx:236 (pastille de 30 px).  
  *Contre-vérification* : La pastille de 30 px est dans le code (PerformanceMode.tsx:236). Je n'ai pas vérifié si une zone tactile élargie existe déjà, ni les 83 px de la capture.
- **dimanche-6** — Éditeur : les six puces de réglage s'empilent sur quatre ou cinq rangées irrégulières, et le champ « présidence » est une puce sans signe (finition, effort moyen · *incertain*)  
  Édition de setlist, haut de la colonne gauche · téléphone (4 rangées), ordinateur 1 280 et tablette paysage (5 rangées dans 400 px) ; tablette portrait et ordinateur 1 440 sont mieux groupées · fr-clair, fr-sombre ; zh-clair respire (3 rangées).  
  *Correction* : Ranger les réglages en une grille de deux colonnes avec un petit libellé (Service, Date, Présidence…) et donner au champ de saisie la même forme que ses voisins, avec une icône de personne.  
  *Preuve* : ordinateur/setlist-edition-fr-clair.png, y≈127 à 320 : cinq rangées avec « Équipe » seule en bas ; telephone/setlist-edition-fr-clair.png, y≈330 à 585 : quatre rangées, « Équipe » seule. « Gaspard T. » (x≈287, y≈271 à 1 280 ; x≈55 à 175 sur téléphone) a la forme d'une puce, sans icône ni libellé, comme les autres, mais c'est un champ de saisie ; sur ordinateur 1 280 il est de plus grisé alors que les autres puces sont blanches.  
  *Contre-vérification* : Captures non ouvertes. L'empilement des puces et le champ de présidence en forme de puce sont une question de goût, à gravité discutable.
- **dimanche-12** — Mode louange à 1 280 px : colonnes déséquilibrées, un grand vide en bas à droite pendant que Pont est reporté (finition, effort moyen · *incertain*)  
  Mode louange · ordinateur 1 280 · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Équilibrer les colonnes par la hauteur (répartir les blocs pour que les deux colonnes finissent à peu près ensemble) ou laisser un bloc tenir sur deux colonnes quand l'espace restant le permet.  
  *Preuve* : ordinateur/mode-louange-fr-clair.png : colonne gauche Intro + Couplet 1 + Refrain (y≈140 à 565), colonne droite Couplet 2 seul (y≈140 à 352), vide d'environ 215 px sous lui. Le bloc Pont n'y tient pas et part à la page suivante (« 1 / 5 »). Comparer ordinateur-1440/mode-louange-zh-clair.png, où les deux colonnes s'équilibrent.  
  *Contre-vérification* : Capture 1 280 non ouverte. Un report de bloc dans une pagination par pages est un comportement normal du mode louange, et la gravité est discutable.
- **dimanche-16** — Page setlist : trois à cinq rangées de métadonnées passent avant les chants, qui commencent presque à mi-écran (finition, effort moyen · *incertain*)  
  Setlist (lecture) · téléphone, tablette portrait, tablette paysage · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Replier les actions d'administration (lien de présentation, export FreeShow, droits) dans le menu « … » ou une feuille, et ne garder au-dessus de la liste que le titre, la date et la note d'équipe.  
  *Preuve* : telephone/setlist-fr-clair.png : sous le titre viennent la date, « Culte Francophone » et « Présidence », « Tu peux modifier », « Ajouter le lien de la présentation », « Exporter pour FreeShow », la note italique, puis seulement le sélecteur Liste/Partitions (y≈853) et le premier chant « Hosanna » (y≈953, sur 2 000 px). Même ordre sur tablette/setlist-fr-clair.png (premier chant à y≈770).  
  *Contre-vérification* : Capture non ouverte. L'ordre des métadonnées avant les chants relève d'un choix produit, à trancher par Timothée plutôt qu'un défaut démontrable.
- **dimanche-17** — Page setlist : des éléments d'aide ou d'action sans forme ni taille de bouton (finition, effort petit · *incertain*)  
  Setlist (lecture) · téléphone, tablette portrait ; 10 à 11 px sur ordinateur · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Donner à « Ajouter le lien » la forme d'un bouton secondaire (bordure, icône de lien) et ne pas descendre sous 12 px pour les libellés d'aide.  
  *Preuve* : telephone/setlist-fr-clair.png, y≈563 : « Ajouter le lien de la présentation » en gris sans bordure ni fond, qui se lit comme du texte inerte ; y≈490 : « Tu peux modifier » avec une icône d'info à peine lisible. Sur ordinateur (ordinateur-1440/setlist-fr-clair.png recadrée sur y 0 à 560) : « FR / 中文 » (y≈151), « Tu peux modifier » (y≈183), « Copier les paroles » et « Idées d'harmonie » (y≈317) sont à environ 10 à 11 px.  
  *Contre-vérification* : Captures non ouvertes. Les tailles de 10 à 11 px et l'aspect du lien « Ajouter le lien » ne sont pas mesurés.
- **dimanche-18** — Une bulle d'aide recouvre les paroles du Couplet 1 à la première ouverture (finition, effort petit · *incertain*)  
  Setlist (lecture) · ordinateur 1 280 (vue sur la capture) ; le 1 440 en fr-clair et le premier passage ailleurs sont à vérifier · fr-clair ; absente en fr-sombre et zh-clair.  
  *Correction* : Ancrer la bulle sous une pastille d'accord avec une flèche et la fermer au premier défilement, plutôt qu'au milieu du texte.  
  *Preuve* : ordinateur/setlist-fr-clair.png, recadrée sur y 0 à 900, bulle noire « Clique sur un accord pour voir comment le jouer… » avec bouton OK sur « Je vois le Roi de… » (x≈815 à 1 093, y≈597 à 695). C'est un état de première visite, donc peut-être un état de capture.  
  *Contre-vérification* : Bulle d'aide de première visite, probablement un état de capture propre à la première ouverture. Capture non ouverte.
- **dimanche-20** — Rail d'icônes en tablette paysage : deux entrées semblent actives et deux notes de musique se côtoient (finition, effort petit · *incertain*)  
  Setlists, Édition de setlist · tablette paysage · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Séparer le groupe « espace » du groupe « page » par un filet ou une étiquette, et donner à « Musiciens » une icône qui ne ressemble pas à « Chants » (un instrument plutôt qu'une note).  
  *Preuve* : tablette-paysage/setlists-fr-clair.png : en haut une maison dans un rond blanc (x≈62, y≈162, espace « App »), en dessous Setlists en bouton noir plein (y≈518) ; une note de musique à y≈244 (espace « Musiciens ») et une autre à y≈433 (« Chants »). Code : src/components/layout/SelecteurEspace.tsx:121-136 (House, Music, ShieldCheck).  
  *Contre-vérification* : Capture du rail non ouverte. C'est une critique d'icônes dans le sélecteur d'espace, discutable. Le logo et le label sont gelés, pas le rail.
- **dimanche-22** — Édition de setlist : « Ajouter des chants » est une barre fixe en tablette portrait mais se cache sous le pli ailleurs (finition, effort moyen · *incertain*)  
  Édition de setlist · tablette paysage, ordinateur 1 280 (à faire défiler) ; tablette portrait et téléphone (barre fixe) ; ordinateur 1 440 (visible) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Sur les dispositions à deux volets, mettre « Ajouter des chants » dans la barre fixe à côté de « Terminé », comme en tablette portrait.  
  *Preuve* : tablette-paysage/setlist-edition-fr-clair.png, volet gauche : le troisième chant est le dernier visible puis vient « Terminé » (y≈1 428), sans « Ajouter des chants » ni « + Transition ». Sur tablette/setlist-edition-fr-clair.png, « Ajouter des chants » est dans la barre fixe du bas (y≈1 700). Sur ordinateur-1440/setlist-edition-fr-sombre.png, les deux boutons sont dans la liste, à y≈660.  
  *Contre-vérification* : Captures non ouvertes. La différence de placement du bouton « Ajouter des chants » entre dispositions peut venir de la mise en page voulue à deux volets.
- **dimanche-23** — Poignées de glisser-déposer minuscules et pâles (six points d'environ 13 px) (finition, effort petit · *incertain*)  
  Édition de setlist · téléphone, tablette portrait, tablette paysage (surtout tactile) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Étendre la cible à 44 px autour des points et passer le gris au niveau du texte secondaire.  
  *Preuve* : tablette/setlist-edition-fr-clair.png, x≈112, y≈600, 760, 920 : six points gris clair, d'environ 13 px de côté. Sur telephone/setlist-edition-fr-clair.png, x≈64 : même taille.  
  *Contre-vérification* : Captures non ouvertes. La taille des poignées et la zone tactile réelle ne sont pas vérifiées.

### Accueil, planning, services, profil

- **quotidien-1** — Page Planning en grand écran : la colonne de droite reste vide quand le compte n'a pas de service à venir (visible au premier coup d'œil, effort petit)  
  Accueil / Planning (onglet Accueil) · ordinateur 1 280 et 1 440 px (et toute disposition « grand » : tablette couchée réelle comprise) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Quand `pourMoiBloc` est absent, ne poser que `ceDimanche` en pleine largeur (le conteneur à 720 px de CeDimanche.tsx:327 range alors déjà Groupes, EDD et Table en trois colonnes), pour que les bords des cartes et du verset s'alignent.  
  *Preuve* : BASE/ordinateur/accueil-fr-clair.png : cartes limitées à x 288–840, vide de 400 px à droite, alors que le verset en dessous va jusqu'à x 1240 ; BASE/ordinateur-1440/accueil-fr-clair.png : cartes x 288–934, vide de 470 px, verset jusqu'à x 1400. Cause dans le code : src/app/planning/page.tsx:219-224, la grille `grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]` réserve toujours la colonne de « Pour moi », alors que `pourMoiBloc` vaut `null` sans service à venir (page.tsx:204).
- **quotidien-3** — Page Moi : la grille en lignes laisse des trous sous les cartes courtes et une colonne gauche vide (à regarder de près, effort moyen)  
  Moi · ordinateur 1 280, 1 440 px, tablette portrait (et tablette couchée) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Remplacer la grille d'aperçus par deux colonnes explicites (ou `columns-2` avec `break-inside-avoid`) pour que les cartes se tassent sans trou, et en grand rendre la colonne du compte collante pour qu'elle suive le défilement.  
  *Preuve* : BASE/ordinateur/moi-fr-clair.png : trou d'environ 75 px sous « Mes services » (x 648–936, y 225–300) à côté de « Mes tâches », puis sous « Mes équipes » ; colonne de gauche vide sous « Déconnexion » (y 625–1000) alors que les cartes de droite continuent. BASE/tablette/moi-fr-clair.png : trou sous « Mes services » (y 780–905 à côté de « Mes tâches »), vide à droite de « Déconnexion » sous « Réglages » (y 480–640), vide à droite de « Ce que tu peux faire » ; « Déconnexion » se retrouve au milieu de la page. Code : src/app/moi/page.tsx:132 (`grid items-start md:grid-cols-2` : une grille en lignes, pas une maçonnerie) et :161-166.
- **quotidien-4** — À 1 280 px, des phrases sont coupées par « … » ou cassées parce que les colonnes sont trop étroites (à regarder de près, effort petit)  
  Accueil / Planning (carte Prochains évènements), Moi (carte Harmonie, carte Mes services) · ordinateur 1 280 px (tout tient à 1 440 px) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Passer les aperçus de Moi en deux colonnes seulement quand le conteneur dépasse environ 720 px (requête de conteneur, comme CeDimanche.tsx:327), sinon une colonne ; le cas de l'accueil se règle avec quotidien-1.  
  *Preuve* : BASE/ordinateur/accueil-fr-clair.png, carte du bas : « Samedi · 12:00 · Parc de la Vill… » coupé alors que BASE/ordinateur-1440/accueil-fr-clair.png l'affiche en entier ; BASE/ordinateur/moi-fr-clair.png : « Prochain chapitre : 1. Le son, les notes … » et « Les fiches de réharmoni… » coupés, « Aucun service à venir — profite du repos » cassé avec « repos » seul sur la deuxième ligne (x 664–925, y 175–200). Cause : trois colonnes (340 px + deux colonnes de ~290 px) imposées par src/app/moi/page.tsx:132 (`md:grid-cols-2` sans tenir compte de la largeur réelle) et colonne de 552 px à l'accueil (voir quotidien-1).
- **quotidien-6** — Mes services en tablette portrait : bascule « À venir / Passés » à 60 % de largeur, bannière et liste sans carte (à regarder de près, effort petit)  
  Mes services · tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Retirer `max-w-sm` pour la bascule pleine largeur, ou centrer la bascule et son contenu dans une carte de 640 px comme dans les dispositions « grand » ; une seule logique pour les quatre dispositions.  
  *Preuve* : BASE/tablette/mes-services-fr-clair.png : la bascule s'arrête à x 663 sur 1277 de largeur utile, calée à gauche, alors qu'elle est pleine largeur sur téléphone (BASE/telephone/mes-services-zh-clair.png), tablette couchée et ordinateur ; la liste et l'état vide sont posés à même la page, sans la carte englobante des autres dispositions. Code : src/components/mesServices/ListeMesServices.tsx:73 (`disposition === "tablette" && "max-w-sm"`).
- **quotidien-7** — Bannière « Active les rappels de service » : bouton de fermeture de 16 px et style hors langage de cartes (à regarder de près, effort petit)  
  Mes services (même composant sur d'autres pages) · téléphone, tablette portrait, tablette couchée, ordinateur · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Donner au bouton de fermeture une zone de 44 px (`after:-inset-3`), passer le texte à 13 px, et reprendre le fond en relief des cartes (ou un fond secondaire sans filet à 16 px de rayon).  
  *Preuve* : BASE/tablette/mes-services-fr-clair.png, coin haut droit de la bannière : la croix (x 1250, y 291) est une icône de 16 px sans marge de toucher ; la bannière a un filet gris foncé de 1 px, un rayon de 12 px et un texte de 12 px (BASE/tablette-paysage/mes-services-fr-sombre.png, texte « Sur iPhone ou iPad… »), alors que les cartes du site sont sans filet, en relief, à 16 px de rayon. Code : src/components/push/PushPrompt.tsx:77-83 (`h-4 w-4`, aucun `after:` d'extension) et :75 (`rounded-xl border border-primary/30 bg-primary/5`, `text-xs`).
- **quotidien-8** — « Je m'inscris » du Petit déj : cible de 32 px sans zone étendue (à regarder de près, effort petit)  
  Accueil / Planning · téléphone, tablette portrait (aussi tablette couchée réelle) · fr-clair, fr-sombre, zh-clair (« 我来报名 »).  
  *Correction* : Ajouter `after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']` ou passer à `h-11` sous pointeur grossier.  
  *Preuve* : BASE/telephone/accueil-fr-clair.png (bouton partiellement sous la barre du bas, artefact) ; BASE/tablette/accueil-fr-clair.png : le bouton « Je m'inscris » mesure environ 41 px de hauteur à l'échelle de la capture. Code : src/components/accueil/CeDimanche.tsx:285 (`h-8`, aucun `after:` ; le lien est `relative z-10`). Le projet exige 44 px.
- **quotidien-5** — Mes services en grand : la carte de la liste est centrée alors que le titre reste calé à gauche (finition, effort petit)  
  Mes services (liste seule, sans service choisi) · ordinateur 1 440 px (à 1 280 px, tout est aligné) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Caler la carte à gauche sous le titre (retirer `mx-auto`, garder la borne de 960 px) pour que les bords gauches s'alignent avec « Mes services ».  
  *Preuve* : BASE/ordinateur-1440/mes-services-fr-clair.png : titre « Mes services » et sous-titre à x 288, carte de x 364 à 1324 ; à 1 280 (BASE/ordinateur/mes-services-fr-clair.png) la carte occupe x 364–1324 mais la barre est plus étroite et l'écart reste visible. Code : src/components/layout/DeuxVolets.tsx:96 (`mx-auto … max-w-[calc(960px+2*var(--marge-page))]` en « colonne seule »).
- **quotidien-10** — Bandeau d'onglets de la page Planning en tablette portrait : l'onglet actif à peine marqué et plus petit que 44 px (finition, effort petit)  
  Planning (barre d'onglets) · tablette portrait · fr-clair, zh-clair, fr-sombre.  
  *Correction* : Marquer l'onglet actif plus nettement (fond `bg-foreground text-background` comme les pilules d'ordinateur ou contour) et porter la cible à 44 px (`min-h-11`).  
  *Preuve* : BASE/tablette/accueil-fr-clair.png, y 320 : « 首页 » est un fond gris très pâle sur le halo, les sept autres onglets sont du texte nu ; à 1 280 px les mêmes onglets sont des pilules avec l'actif en noir (BASE/ordinateur/accueil-fr-clair.png, y 110), et le téléphone passe par un menu déroulant « Accueil ⌄ ». Code : src/components/layout/SectionTabs.tsx:158-160 (`min-h-10`, actif = `bg-secondary` quand il n'a pas de couleur de service ; hauteur 40 px, sans zone étendue).
- **quotidien-11** — Cartes de l'accueil : EDD étirée avec un vide dessous, rangée Prépa. Table / Évènements aux bas inégaux (finition, effort petit)  
  Accueil / Planning · tablette portrait, tablette couchée, ordinateur · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Donner aux lignes d'EDD la même hauteur minimale que celles de Groupes et aligner les deux cartes du bas (`items-stretch`) pour des bords nets.  
  *Preuve* : BASE/tablette/accueil-fr-clair.png : la carte EDD (x 725–1277) fait la hauteur de Groupes, avec environ 130 px de blanc sous « 高班 » (y 810–930) ; la carte « Prépa. Table » finit à y 1112 et « Prochains évènements » à y 1130. Code : src/components/accueil/CeDimanche.tsx:342 (grille qui étire) et :346 (`items-start`). Les lignes de Groupes ont deux lignes de texte (nom + tiret), celles d'EDD une seule : les hauteurs diffèrent.
- **quotidien-12** — Verset en italique simulé sur du chinois (finition, effort petit)  
  Accueil / Planning · toutes · zh-clair.  
  *Correction* : Poser `italic` seulement en français (`[&:lang(zh)]:not-italic` ou test sur la langue de l'interface).  
  *Preuve* : BASE/tablette/accueil-zh-clair.png, bloc gris du bas (y 1210–1260) : les caractères sont penchés artificiellement, alors que les titres sont droits ; BASE/ordinateur/accueil-zh-clair.png, y 758. Code : src/app/planning/page.tsx:233 (`italic` appliqué sans condition de langue). Le chinois n'a pas d'italique : le navigateur déforme les traits.
- **quotidien-14** — Sélecteurs segmentés en sombre : la pastille active est plus sombre que la piste (noir sur #2c2c2e), à l'inverse de la barre du bas (finition, effort petit)  
  Mes services (À venir / Passés), sélecteur App / Musiciens / Back-Office · toutes · fr-sombre.  
  *Correction* : En sombre, donner à la pastille active un fond plus clair que la piste (par exemple `dark:bg-foreground/15`) et un filet, comme l'état actif de la barre du bas.  
  *Preuve* : BASE/tablette/mes-services-fr-sombre.png, y 440 : « À venir » en pastille noire sur piste gris foncé, tandis que la pastille active de la barre du bas (« Moi », y 1680) est blanche ; BASE/tablette-paysage/mes-services-fr-sombre.png : pastille « maison » noire sur capsule grise. Le contraste de forme est d'environ 1,5:1 ; l'état tient surtout à la couleur du libellé. Code : src/components/layout/SelecteurEspace.tsx (`bg-background text-foreground shadow-sm`).
- **quotidien-13** — Verset en sombre : plus clair que les cartes de données, il prend plus de poids que le contenu (finition, effort petit · *incertain*)  
  Accueil / Planning · toutes · fr-sombre.  
  *Correction* : En sombre, donner au verset le fond des cartes ou un fond plus bas que lui, pour qu'il reste en retrait.  
  *Preuve* : BASE/telephone/accueil-fr-sombre.png, y 1465–1690 : fond d'environ #2c2c2e contre #1c1c1e pour les cartes de données, texte italique gris à contraste moyen ; BASE/ordinateur-1440/accueil-fr-sombre.png, y 728–836. Code : src/app/planning/page.tsx:232 (`bg-secondary`, qui s'éclaircit en sombre).  
  *Contre-vérification* : Je n'ai pas ouvert les captures sombres de l'accueil. Le code (bg-secondary) rend l'écart de fond plausible, mais je n'ai pas vu le contraste réel. Quant à l'effet « plus de poids que le contenu », c'est une question de goût.
- **quotidien-15** — Interface 中文 : le titre du prochain chapitre d'Harmonie reste en français (finition, effort moyen · *incertain*)  
  Moi (carte Harmonie) · toutes · zh-clair.  
  *Correction* : Si le cours est traduit, lire le titre dans la langue de l'interface ; sinon, mettre la mention « (法语) » après le titre.  
  *Preuve* : BASE/ordinateur/moi-zh-clair.png, y 413 : « 下一章 : 1. Le son, les notes et le clavier » ; le titre vient de src/components/moi/Apercus.tsx:215 (`prochain.titre`), du contenu du cours. À vérifier : le cours existe-t-il en chinois ?  
  *Contre-vérification* : Je n'ai pas ouvert la capture zh ni vérifié si le cours existe en chinois. Le titre vient de prochain.titre, le contenu du cours, donc le français peut être voulu.

### Évènements, guide, connexion

- **eglise-5** — Les captures du guide restent en français dans l'interface en chinois (visible au premier coup d'œil, effort gros)  
  Guide · téléphone, tablette, tablette paysage, ordinateur, ordinateur 1 440 · zh-clair.  
  *Correction* : Produire un second jeu de captures en chinois (/guide/zh/<id>.png) avec le même script Playwright et choisir le dossier selon la langue ; en attendant, retirer les captures de la version chinoise plutôt que d'y montrer une interface qu'un lecteur ne reconnaît pas.  
  *Preuve* : telephone/guide-zh-clair.png (crop y 3000-5600) : sous le texte chinois, les deux captures montrent « Chants », « Choisis un chant », « Prochaines setlists », « Personnaliser » ; seules les pastilles noires superposées sont en chinois (« 诗歌标签 », « 搜索 », « 个性化 »). Même chose sur ordinateur-1440/guide-zh-clair.png (y 330-1190) et tablette-paysage/guide-zh-clair.png. Code : src/components/guide/GuideFigure.tsx:114-118, une seule image /guide/${figure.id}.png pour les deux langues ; public/guide/*.png (15 fichiers).
- **eglise-1** — Le bouton rond « + » flottant recouvre « S'inscrire » et le compteur d'inscrits (à regarder de près, effort petit)  
  Évènements (liste) · téléphone · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Réserver sous le contenu la place du rond (pied de page = hauteur de barre + 52 px + marge) pour que la dernière carte ne passe jamais dessous, ou, à défaut, remonter le rond au-dessus du bouton d'inscription seulement quand une carte à bouton est en bas.  
  *Preuve* : telephone/evenements-fr-clair.png : rond noir en bas à droite (x 696-800, y 1410-1515 dans l'image affichée, ×1,30) posé sur le bout droit du bouton « S'inscrire » et à côté de « 12 déjà inscrits ». Même chose en -fr-sombre et -zh-clair. Ce n'est pas un artefact de pleine page : la page est plus courte que l'écran, le rond fixe retombe donc sur la carte au repos. Code : src/components/layout/BoutonNouveau.tsx:19 (fixed bottom-[calc(var(--tabbar-bottom)+76px)] right-4, 52 px), src/app/evenements/CalendrierClient.tsx:179 (pb-16 seulement).
- **eglise-3** — En clair, les cartes de l'évènement sont invisibles : le contenu flotte, décalé de 16 px, et la carte « Tâches » est plus large que tout le reste (à regarder de près, effort petit)  
  Évènements (liste en un volet) ; Évènement (fiche en un volet) · téléphone, tablette portrait · fr-clair et zh-clair (en sombre la même carte a un fond et tient).  
  *Correction* : Remplacer bg-card par raised (ombre en clair, fond de groupe en sombre) sur ces trois cartes, comme dans la fiche en deux volets, pour que le cadre existe dans les deux thèmes et que « Tâches » s'aligne.  
  *Preuve* : telephone/evenements-fr-clair.png : titre « Évènements » et « Novembre 2026 » à x≈33-41, contenu de la carte à x≈65 (affiché) sans fond ni cadre ; en -fr-sombre la carte (x 33-800) encadre ce même contenu. telephone/evenement-fr-clair.png : gestion et fiche sans fond, mais « Tâches » (y 1580-1740) a une ombre et déborde de ~26 px de chaque côté du contenu au-dessus. Cause : --card = blanc = --background en clair (src/app/globals.css:189-191), donc bg-card est invisible, alors que la fiche en grand et « Tâches » utilisent .raised. Code : src/app/evenements/EvenementCard.tsx:194 (bg-card p-4), src/app/evenements/[id]/EvenementClient.tsx:347 et :355 (bg-card), contre :312 et :315 (raised) et src/app/evenements/[id]/TachesEvenement.tsx:78 (raised). 52 fichiers utilisent bg-card, 70 raised.
- **eglise-4** — Évènement sans image : grand aplat gris avec une icône d'image, qui ressemble à une image cassée (à regarder de près, effort petit)  
  Évènements (liste en un volet) ; Évènement (fiche en un volet) · téléphone, tablette portrait (en deux volets la fiche masque ce cadre, la liste est en lignes) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Ne pas afficher de cadre quand il n'y a pas d'image (comme déjà fait en grand), ou lui donner un visuel voulu (vignette de date à la couleur de la catégorie) plutôt que l'icône d'attente.  
  *Preuve* : telephone/evenements-fr-clair.png : cadre gris de y 518 à 910 (affiché ×1,30, soit ~195 px de haut sur 915) en tête de la seule carte, 40 % du premier écran. tablette/evenement-fr-clair.png : cadre de y 741 à 1262 (×1,38, ~360 px sur 1 620 px de large). Code : src/app/evenements/EvenementCard.tsx:67-79 (Banniere : zone d'attente 16/9 quand il n'y a pas d'image) ; la fiche en grand, elle, écrit « Sans image, la fiche commence par son titre » (src/app/evenements/[id]/EvenementClient.tsx:309, e.images[0] &&). Les deux règles se contredisent.
- **eglise-7** — Guide : la bande « Pour toi, en 1 carte » est plus large que la colonne qui la suit (à regarder de près, effort petit)  
  Guide · tablette portrait, tablette paysage, ordinateur, ordinateur 1 440 · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Poser la bande dans le même conteneur que la grille (même largeur maximale, même gouttière) pour que ses deux bords tombent sur ceux du sommaire et de la colonne.  
  *Preuve* : ordinateur/guide-fr-clair.png (crop y 0-1500) : la bande s'arrête à x≈1087 alors que les sections vont jusqu'à x≈1240 ; en 1 440, ordinateur-1440/guide-zh-clair.png (y 130-188) : bande à x≈1087, sections à x≈1307. tablette-paysage/guide-fr-clair.png : bande à x≈1248 contre carte « Sur cette page » à x≈1209 (affiché ×1,08). Code : src/app/guide/page.tsx:181 (la bande a max-w-[calc(720px+2*marge)] dans un parent déjà bordé de marge : 752 px) contre :197 (grille de 260 + 40 + 720 px, ou 720 px de contenu en un volet).
- **eglise-9** — Titres de cartes de la fiche à deux tailles différentes, étiquettes Date / Heure / Lieu à 12 px (finition, effort petit)  
  Évènement (fiche), Évènements (volet de droite) · téléphone, tablette, ordinateur 1 280 et 1 440 · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Un seul niveau pour les titres de carte de la fiche (15 ou 16 px, font-semibold) ; porter les étiquettes à 13 px si la carte a la place.  
  *Preuve* : ordinateur/evenements-fr-clair.png : « Inscriptions » (y 544) est nettement plus petit que « Tâches » (y 832) alors que ce sont deux cartes de même niveau. Code : src/app/evenements/[id]/Inscriptions.tsx:236 (text-sm font-semibold) contre src/app/evenements/[id]/TachesEvenement.tsx:80 (text-base font-semibold). Étiquettes « Date », « Heure », « Lieu » : text-xs (12 px, pas 10 px comme noté à la première passe) en text-muted-foreground, src/app/evenements/EvenementCard.tsx:113.
- **eglise-15** — Pas de bouton clair/sombre sur téléphone pour un visiteur déconnecté (finition, effort petit)  
  Connexion (et toute page publique) · téléphone · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Assumer le choix (réglage du système, noté dans le guide) ou donner au visiteur un accès au thème, par exemple dans le menu de langue.  
  *Preuve* : telephone/connexion-fr-clair.png : l'en-tête n'a que « FR » et « Connexion » ; tablette/connexion-zh-clair.png montre le croissant de lune entre la langue et « 登录 ». Code : src/components/layout/Navbar.tsx:257 (hidden sm:flex pour un visiteur, hidden lg:flex pour un membre). L'interface suit alors le réglage du système sans moyen de le changer.
- **eglise-16** — Nom du site en chinois : « 敬拜 » dans l'en-tête, « 敬拜诗歌 » dans le bandeau (finition, effort petit)  
  Connexion et en-têtes · téléphone, tablette portrait, ordinateur, ordinateur 1 440 · zh-clair.  
  *Correction* : Choisir un seul nom (« GCC 敬拜 » ou « GCC 敬拜诗歌 ») pour l'en-tête, le bandeau et le guide.  
  *Preuve* : tablette/connexion-zh-clair.png : en-tête « GCC 敬拜 » (y 45), bandeau « GCC 敬拜诗歌 » (y 410). En français « GCC Louange » est identique aux deux endroits. Code : src/locales/zh-CN.json:6 (« GCC 敬拜 ») contre :151 et :189 (« GCC 敬拜诗歌 »).
- **eglise-17** — « Comment ça marche ? » est centré sur la page alors que le contenu est calé à gauche (finition, effort petit)  
  Évènements (liste) · tablette portrait, tablette paysage (non constaté à 1 280 px où le lien est dans la carte de liste) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Aligner le lien à gauche dans le gabarit de page (ou le centrer sous la colonne qui le porte) au lieu de centrer sur la fenêtre.  
  *Preuve* : tablette/evenements-fr-clair.png : lien centré à x≈658 (page entière, ×1,23) sous une carte calée sur x 65-619. tablette-paysage/evenements-fr-clair.png : lien à x≈1230 alors que la carte finit à x≈1185 (×1,08). Code : src/components/guide/GuideLien.tsx:17 (text-center en dur).
- **eglise-19** — Guide : l'encadré d'astuce est en 12 px gris sur gris clair (finition, effort petit)  
  Guide · téléphone, tablette, ordinateur · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Porter l'astuce à 13-14 px (text-[13px] ou text-sm) pour qu'elle reste lisible à côté d'un corps de 15 px.  
  *Preuve* : ordinateur/guide-fr-sombre.png (crop y 1000-2400, y≈1050) : « En mode Jianpu, la structure n'est pas modifiable… » en texte minuscule sous un texte courant de 15 px. Le contraste calculé passe 4,5:1, c'est la taille qui gêne, surtout sur téléphone. Code : src/app/guide/page.tsx:257 (text-xs leading-relaxed text-muted-foreground, sur bg-secondary/60).
- **eglise-6** — Captures du guide : éblouissantes en sombre et illisibles sur téléphone (à regarder de près, effort moyen · *incertain*)  
  Guide · téléphone (texte de l'image à ~3 px), ordinateur et ordinateur 1 440 (~5 px), tablette (éblouissement) · fr-sombre surtout ; fr-clair et zh-clair pour la lisibilité.  
  *Correction* : Adoucir l'image en sombre (dark:brightness-90, cadre plus net) et ajouter un toucher pour agrandir la capture ; à terme, des captures téléphone à ~390 px pour la disposition téléphone et des captures sombres.  
  *Preuve* : ordinateur/guide-fr-sombre.png (crop y 1000-2400) : rectangles blancs et crème de 610 px de large dans une page noire, texte intérieur illisible. telephone/guide-fr-sombre.png (crop y 3000-5600) : la capture de bureau de 1 280 px est réduite à ~330 px de large ; seules les pastilles de 12 px sont lisibles, l'image ne montre plus que des taches. Code : src/components/guide/GuideFigure.tsx:112-122 (PNG unique en thème clair, object-cover, aucune variante sombre ni agrandissement).  
  *Contre-vérification* : La petitesse du texte des captures sur téléphone est réelle (texte de l'image illisible à cette échelle). L'éblouissement en sombre n'a pas été vérifié sur la capture sombre ; le code confirme l'absence de variante sombre.
- **eglise-8** — Boutons d'action serrés contre le titre ou le retour : la barre de la fiche est à l'étroit (finition, effort petit · *incertain*)  
  Évènement (fiche) ; Évènements (volet de droite) · téléphone, ordinateur 1 280 (à 1 440 px le titre tient sur une ligne) · fr-clair, fr-sombre.  
  *Correction* : Au-dessous de ~600 px de largeur utile, mettre « Gérer » en icône seule comme « Partager » (ou sur sa propre ligne) et laisser le titre prendre toute la largeur au-dessus.  
  *Preuve* : telephone/evenement-fr-clair.png (y 135-200, ×1,60) : « ‹ Évènements », « Gérer dans le Back-Office » (~215 px sur 412) et le rond « Partager » tiennent sur une seule ligne avec ~18 px d'écart entre le retour et le bouton ; une langue ou un mot plus long ne laisse plus de marge. ordinateur/evenements-fr-clair.png (y 185-240) : le titre « Pique-nique de rentrée » se casse en deux lignes entre les deux boutons de 212 et 104 px. Code : src/app/evenements/[id]/EvenementClient.tsx:333-345 (barre téléphone) et :326-345 (titre + deux boutons en flex items-end).  
  *Contre-vérification* : Sur téléphone la barre tient avec peu de marge (retour, « Gérer dans le Back-Office », partage). Le titre cassé en deux sur ordinateur est visible mais correct. Défaut de marge, pas de casse ; sévérité faible.
- **eglise-10** — Fiche en un volet : pour qui gère l'évènement, la gestion des inscriptions et le QR passent avant quand et où (finition, effort moyen · *incertain*)  
  Évènement (fiche) · téléphone, tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Garder la gestion sous la fiche (ou dans un volet repliable « Gérer les inscriptions ») pour que le premier écran réponde à quand, où et comment s'inscrire, y compris pour la personne qui organise.  
  *Preuve* : telephone/evenement-fr-clair.png : « Inscriptions », compteur, onglets, QR et lien occupent y 360-770 (×1,60) ; date, heure, lieu et « S'inscrire » ne viennent qu'à y 1200-1440, soit ~1 900 px plus bas sur l'écran réel. Code : src/app/evenements/[id]/EvenementClient.tsx:346-352 (carte de gestion rendue avant la fiche, :355). Le compte de test est administrateur : la vue d'un membre simple n'a pas été capturée, elle commence directement par la fiche.  
  *Contre-vérification* : Sur téléphone la gestion passe bien avant la fiche (capture et EvenementClient). L'ordre peut être voulu par les specs évènements (organisateur d'abord) ; je n'ai pas tranché. Le compte membre simple n'a pas été vu.
- **eglise-11** — Connexion : la marque et le mot « Connexion » sont dits deux et trois fois (finition, effort petit · *incertain*)  
  Connexion · téléphone, tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Sur /login, masquer le bouton « Connexion » de l'en-tête et la marque de l'en-tête (le bandeau la porte déjà) pour laisser une seule action pleine.  
  *Preuve* : telephone/connexion-fr-clair.png : logo et « GCC Louange » dans l'en-tête (y 20-95) puis encore dans le bandeau (y 185-440) ; « Connexion » en bouton plein en haut à droite, en titre de formulaire (y 635-690), puis « Se connecter » en bouton (y 1100-1190). Le bouton de l'en-tête mène à la page où l'on est déjà. Code : src/components/auth/EcranMarque.tsx:96-104 (panneau de marque) ajouté à src/components/layout/Navbar.tsx:144-148 et :247.  
  *Contre-vérification* : Non vérifié sur la capture de connexion. Une redondance de marque entre en-tête et bandeau est plausible, mais peut être voulue comme identité de la page.
- **eglise-12** — Le bandeau de marque se coupe sur une ligne droite, surtout en sombre (finition, effort petit · *incertain*)  
  Connexion · téléphone, tablette portrait (en deux panneaux, la coupe est la frontière voulue) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Estomper le bas du bandeau (mask-image: linear-gradient(to bottom, #000 70%, transparent)) ou étendre le halo derrière le formulaire pour supprimer la ligne.  
  *Preuve* : telephone/connexion-fr-sombre.png : halos rouge et bleu sur gris #17171a qui s'arrêtent net à y≈562 (×1,30), le noir du formulaire commence dessous ; en clair, tablette/connexion-zh-clair.png (y≈556, ×1,23) : le dégradé gris finit sur un bord horizontal. Code : src/app/globals.css:762-773 (.panneau-marque : fond de la boîte seulement, hsl(var(--secondary)/0.5) en plus des halos).  
  *Contre-vérification* : Non vérifié sur la capture. La coupe nette du bandeau est cosmétique et peut être le choix de la frontière entre marque et formulaire.
- **eglise-13** — Connexion : liens secondaires à trois styles, formulaire petit à grand écran (finition, effort petit · *incertain*)  
  Connexion · ordinateur et ordinateur 1 440 (liens), toutes (styles) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Un seul style pour les liens du même niveau (gris souligné, 14 px) ; porter le formulaire à ~420 px et le titre à la même échelle que le panneau de marque sur ordinateur.  
  *Preuve* : ordinateur-1440/connexion-fr-clair.png : champs de 380 px, libellés et liens à ~12-13 px dans une moitié droite de 600 px ; formulaire de y 260 à 640 sur 900 px. Les trois liens du bas (y 571, 601, 631) ont trois traitements : « Mot de passe oublié ? » gris souligné, « Créer un compte » noir souligné, « Revenir aux chants » gris sans soulignement. Code : src/app/(auth)/login/page.tsx:105-117 (text-sm, trois jeux de classes) et src/components/auth/EcranMarque.tsx:109 (max-w-[380px] à toutes les tailles).  
  *Contre-vérification* : Le code montre bien des classes différentes entre liens (muted et underline, foreground et underline). La taille du formulaire à grand écran n'a pas été regardée sur la capture.
- **eglise-14** — Tablette paysage déconnectée : barre réduite à trois icônes dont le nom n'apparaît qu'au survol (finition, effort moyen · *incertain*)  
  Connexion et toutes les pages en barre réduite · tablette paysage (tactile : pas de survol) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Garder le libellé visible en tablette paysage (barre à 76 px avec légende sous l'icône, comme la barre du bas) ou rendre le pictogramme de dépliage évident (libellé court) ; aucun libellé n'est perdu pour les lecteurs d'écran (aria-label présent).  
  *Preuve* : tablette-paysage/connexion-fr-clair.png : note, ticket et un pictogramme de panneau (x≈63, y 160, 248, 355 affiché ×1,08) sans libellé, connexion en rond noir en bas. Le nom n'existe qu'en title (infobulle au survol) : src/components/layout/BarreLaterale.tsx:294 (title={enIcones ? t(cle) : undefined}) et :376 ; le projet demande un équivalent au toucher pour tout ce qui s'offre au survol (CLAUDE.md « Gestes »).  
  *Contre-vérification* : Barre réduite à icônes avec title seul (code). La spec navigation grand écran a pu trancher ce choix pour la tablette paysage ; non vérifié à l'image. Tous les libellés restent en aria-label.
- **eglise-18** — Guide : le sommaire de 15 entrées prend plus d'un écran avant le premier contenu (finition, effort petit · *incertain*)  
  Guide · téléphone · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Replier le sommaire en un bloc ouvert au toucher (un <details> « Sur cette page ») ou le passer en rangée défilante, ouvert par défaut seulement à partir de la tablette.  
  *Preuve* : telephone/guide-fr-clair.png (crop y 0-2600, ×0,6) : le sommaire « Sur cette page » va de y≈410 à 1560 (affiché) en 15 lignes de 44 px ; la première section ne commence qu'au-delà. Code : src/app/guide/page.tsx:150-160 (min-h-11 sur chaque entrée en téléphone).  
  *Contre-vérification* : Le sommaire de 15 entrées est long en code (min-h-11), mais un sommaire en tête de guide est un choix défendable ; la capture téléphone n'a pas été vérifiée.

### Espace Musiciens

- **musiciens-2** — Les filtres prennent plus de place que la liste qu'ils filtrent (à regarder de près, effort moyen)  
  Harmonie · Ordinateur 1280 × 720 (volet liste de 592 px : une seule ligne de fiche visible) ; téléphone (le premier écran n'est que de la navigation et des puces, la première famille démarre sous le pli) ; moins marqué à 1440 × 900 (trois lignes et demie). · Identique en fr-clair, fr-sombre, zh-clair..  
  *Correction* : Replier les trois rangées de puces derrière un seul bouton « Filtres » (avec compteur des filtres actifs), ou les ramener à une rangée, et n'afficher « Par où commencer » que sans filtre actif.  
  *Preuve* : ordinateur/harmonie-fr-clair.png : instrument + 3 rangées de puces (y 148-305) + « Par où commencer » (3 lignes) + « Voir plus » avant « Substitutions » (y 617) ; la liste ne tient que dans y 632-696. Téléphone : telephone/harmonie-fr-clair.png (recadrage y 0-1900 relu : deux lignes de liens, instrument, 3 rangées de puces et 3 étapes avant la première famille). Code : src/components/harmonie/Catalogue.tsx:174-203 (trois Pilules empilées) et :207-240 (parcours).
- **musiciens-10** — Contenu des fiches Harmonie resté en français dans l'interface 中文 (à regarder de près, effort gros)  
  Harmonie · Toutes. · zh-clair seulement : titres de familles (Substitutions, Couleurs, Basses…), titres de fiches, 3 cartes « Par où commencer », phrase « devient … » et corps de la fiche ; sous-lignes, étiquettes, bouton et bandeaux sont bien traduits (柔和亲密, 待校对, 从这里开始)..  
  *Correction* : Poser lang="fr" sur les titres et corps de fiches non traduits (bonne police et lecture vocale correctes) ; le reste est un chantier de traduction déjà planifié, pas de mise en page.  
  *Preuve* : tablette/harmonie-zh-clair.png : « Le 2m7 à la place du 4 [待校对] / 柔和亲密 · 张力 » sur la même ligne. C'est le contenu (docs/harmonie/*.md) plus que la mise en page : docs/spec-harmonie.md:295-296 prévoit la traduction chinoise « ensuite », famille par famille. Aucun lang= sur ces textes (src/components/harmonie/*.tsx).
- **musiciens-3** — Bande vide de 44 px en haut de la carte liste, et deux interrupteurs Piano / Guitare visibles en même temps (finition, effort petit)  
  Harmonie · Ordinateur 1280 et 1440 (deux volets). · fr-clair, fr-sombre, zh-clair..  
  *Correction* : Ne rendre le bloc Théorie / RD-2000 que si deuxVolets est faux (au lieu de md:hidden) pour supprimer la marge fantôme, et garder un seul interrupteur d'instrument (celui de la liste).  
  *Preuve* : ordinateur-1440/harmonie-fr-clair.png : la carte liste commence à y 104, le sélecteur Piano/Guitare à y 148 ; un second Piano/Guitare en haut à droite du volet de détail (x 1250-1400, y 105-140). Cause trouvée : src/components/harmonie/Catalogue.tsx:147 pose pt-6 (24 px) + space-y-5, et le bloc Théorie / RD-2000 (:151, md:hidden) est masqué par display:none, pas par l'attribut hidden : Tailwind 3 (package.json:61) lui laisse sa marge de 20 px sur le frère suivant (24 + 20 = 44). Doublon : Catalogue.tsx:179-185 et src/components/harmonie/FicheHarmonie.tsx:116.
- **musiciens-4** — Rangées de puces coupées net, sans indice qu'elles défilent (finition, effort petit)  
  Harmonie · Les quatre : ordinateur (« Fi » pour « Fin », « Surprise » collé au bord), tablette portrait (« D » après « Émerveillement »), téléphone (« Surpri »), paysage (« Douceur et intimité » coupé au bord de l'écran). · fr-clair, fr-sombre, zh-clair (en 中文 la coupe tombe sur un autre mot, même absence d'indice)..  
  *Correction* : Ajouter un fondu (mask-image linéaire) sur le bord droit des rangées qui débordent, pour qu'une puce coupée se lise comme « il y en a d'autres » et non comme un bug.  
  *Preuve* : ordinateur/harmonie-fr-clair.png, volet liste, rangée Intro … Fin à y 249 (x 660-688) ; telephone/harmonie-fr-clair.png recadré, rangée Épique … « Surpri » à y 962. Code : src/components/layout/Onglets.tsx:178 (overflow-x-auto, barre de défilement masquée, aucun fondu).
- **musiciens-5** — Coupures de ligne peu soignées : mot orphelin et légende de doigtés coupée entre le chiffre et son nom (finition, effort petit)  
  Harmonie (fiche) et Accords · Doigts : toutes (téléphone, tablette portrait, ordinateur, 1440, et paysage ; « pouce » seul à la ligne dès la tablette). « 5. » orphelin : ordinateur 1280 seulement. « G）。 » orphelin : téléphone et paysage en 中文. · Doigts : fr-clair et fr-sombre. « 5. » : fr-clair, fr-sombre, zh-clair. « G）。 » : zh-clair..  
  *Correction* : Rendre chaque doigt en élément insécable (« 4 auriculaire », « P pouce » en whitespace-nowrap, séparés par « · ») et poser text-wrap: pretty sur les paragraphes de fiche et de notes de bas de page.  
  *Preuve* : ordinateur/accords-fr-clair.png, ligne « Doigts » à y 767-785 : « … 4 auriculaire · P / pouce » (recadrage agrandi relu). ordinateur/harmonie-fr-clair.png, « Avant → après », « 5. » seul à y 335. Code : une seule chaîne pour la légende (src/components/accords/PanneauAccord.tsx:275, src/locales/fr.json:2840), aucun text-wrap dans src/app/globals.css.
- **musiciens-6** — Fiche Harmonie à 1280 px : colonnes étroites et déséquilibrées (finition, effort petit)  
  Harmonie (volet de détail) · Ordinateur 1280 (volet de détail d'environ 530 px, deux colonnes de 258 px) ; résolu à 1440. · fr-clair, fr-sombre, zh-clair..  
  *Correction* : Passer la grille de la fiche en une colonne quand le volet de détail fait moins d'environ 640 px (requête de conteneur plutôt que la disposition), ou poser « Au piano » sous « Pourquoi ça marche ».  
  *Preuve* : ordinateur/harmonie-fr-sombre.png : « Pourquoi ça marche / Quand l'éviter » fait environ 465 px de haut (y 437-902) à côté d'un bloc « Au piano » de 260 px (y 437-695) ; comparer à ordinateur-1440/harmonie-fr-clair.png où les deux colonnes s'équilibrent. Code : src/components/harmonie/FicheHarmonie.tsx:151 (grid-cols-2 dès que deuxVolets, sans tenir compte de la largeur réelle du volet).
- **musiciens-7** — Tablette portrait : titres de fiches coupés par « … » et trous sous les cartes courtes (finition, effort petit)  
  Harmonie · Tablette portrait (2 colonnes de cartes de familles). Le téléphone, en une colonne, affiche les mêmes titres en entier. · fr-clair, fr-sombre, zh-clair (les titres français coupés restent coupés en 中文)..  
  *Correction* : Laisser le titre passer sur deux lignes (line-clamp-2 au lieu de truncate) et remplacer la grille par des colonnes CSS (md:columns-2) pour que les cartes s'empilent sans trou.  
  *Preuve* : tablette/harmonie-zh-clair.png : « Même tonalité : enchaîner sans co… », « +1 ton par le 5 de la nouvelle tonal… » ; trous sous « Substitutions » (face à Couleurs) et « Voicings » (face à Transitions). Code : src/components/harmonie/Catalogue.tsx:259 (truncate sur le titre) et :252 (md:grid-cols-2 md:items-start).
- **musiciens-8** — Le badge « à relire » répété sur chaque ligne et le « Voir plus » sans forme de bouton (finition, effort petit)  
  Harmonie · Toutes (téléphone, tablette, volet liste). · fr-clair, fr-sombre, zh-clair (« 待校对 »)..  
  *Correction* : Ne marquer que l'exception (retirer le badge des lignes tant que le bandeau de relecture est affiché, ou ne signaler que les fiches validées) et donner à « Voir plus » un chevron et le texte en encre.  
  *Preuve* : tablette/harmonie-fr-clair.png : toutes les lignes portent le badge (11 px, gris sur gris) alors que le bandeau « Les fiches sont en relecture » le dit déjà ; « Voir plus » à y 582 est un texte gris sans chevron ni contour, aspect désactivé. Code : src/components/harmonie/Catalogue.tsx:261 (text-[11px]) et :235.
- **musiciens-9** — Petits textes de 10 à 12 px dans les légendes et les diagrammes (finition, effort petit)  
  Accords et Harmonie · Toutes ; plus gênant au téléphone et en lecture à distance sur tablette. · fr-clair, fr-sombre, zh-clair (les légendes zh à 12 px en caractères chinois sont plus pénibles encore)..  
  *Correction* : Monter les légendes à 13 px (comme les sous-lignes déjà en text-[13px]) et ne pas descendre sous 12 px dans les diagrammes.  
  *Preuve* : ordinateur/accords-fr-clair.png : légende « Les notes s'écrivent en lettres… » (y 212) et note de fin (y 772-792) ; ordinateur-1440/harmonie-fr-clair.png : « G B D » sous le clavier. Code : src/components/accords/PageAccords.tsx:87 et :143 (text-xs), src/components/accords/PanneauAccord.tsx:199 (text-xs), src/components/harmonie/Catalogue.tsx:261 (11 px), src/components/harmonie/FicheHarmonie.tsx:200 (figcaption 11 px). Le contraste, lui, passe AA en clair comme en sombre.
- **musiciens-11** — Listes déroulantes de la fiche (Tonalité, Capo) de 36 px au toucher (finition, effort petit)  
  Harmonie (fiche) · Téléphone et tablette (toucher) ; sans effet à la souris sur ordinateur. · Toutes..  
  *Correction* : Passer à h-11 sous (pointer: coarse) ou étendre la zone de toucher avec un ::after, comme pour les pilules.  
  *Preuve* : Code seulement, la fiche n'est pas capturée sur téléphone ni tablette : src/components/harmonie/FicheHarmonie.tsx:137 et :182 (h-9 = 36 px). Sur ordinateur, ordinateur-1440/harmonie-fr-clair.png montre la liste « Tonalité » à y 344-376.
- **musiciens-12** — Diagramme d'accord de taille fixe (162 px) dans une carte de 400 à 440 px (finition, effort petit)  
  Accords · Ordinateur, 1440 et tablette (carte large) ; sans problème au téléphone. · Identique en fr-clair, fr-sombre, zh-clair..  
  *Correction* : Agrandir le diagramme d'environ 1,3 fois dans la variante carte (24 → 30 px entre deux cordes) : jugement de goût, à valider à l'œil.  
  *Preuve* : ordinateur-1440/accords-zh-clair.png : manche d'environ 120 px de large au centre d'une carte d'environ 440 px, grandes marges vides à gauche et à droite alors que c'est l'objet de la page. Code : src/components/harmonie/Diagrammes.tsx:129 (largeur 162 en dur pour grand).

### Back-office

- **back-office-1** — Téléphone en français : la cloche déborde du bord droit de l'écran (visible au premier coup d'œil, effort petit)  
  Toutes les pages du Back-Office (accueil À faire, fiche d'une équipe), à voir aussi sur les autres pages qui montrent le sélecteur d'espace · téléphone · fr-clair, fr-sombre (la version chinoise tient).  
  *Correction* : Sur téléphone, resserrer les segments (px-2.5 au lieu de px-3.5, soit environ 24 px de gagnés sur les trois onglets) ou laisser le groupe rétrécir (min-w-0 et parts égales), pour que logo, sélecteur, boîte de messages et cloche tiennent dans 393 px avec la marge droite.  
  *Preuve* : telephone/back-office-fr-clair.png et telephone/taches-fr-clair.png : en haut à droite, le rond de la cloche est coupé par le bord de l'écran (vers x=983 sur 983) ; en chinois (telephone/back-office-zh-clair.png) elle est entière. Code : src/components/layout/SelecteurEspace.tsx:156 (px-3.5 par segment) et :164 (le groupe est shrink-0) ; src/components/layout/Navbar.tsx:26-27 (ICON_BUTTON shrink-0).
- **back-office-3** — Sombre : les boutons « Fait » et « Relier » et la pastille active du sélecteur sont noirs sur gris, ils s'enfoncent au lieu de se lever (à regarder de près, effort petit)  
  À faire (boutons des rangées, sélecteur d'espace en barre réduite et en onglets) · toutes ; le plus net en tablette paysage (barre réduite) et à l'accueil du Back-Office · fr-sombre (le clair est correct : blanc sur gris très clair, et blanc sur blanc cerné d'un filet).  
  *Correction* : En sombre, donner à l'élément « posé » un fond plus clair que sa surface (comme le segmenté d'iOS : un gris #3a3a3c ou un voile blanc à 8 %) pour la variante outline posée sur carte et pour le segment actif, plutôt que le noir de la page.  
  *Preuve* : ordinateur/back-office-fr-sombre.png : « Fait » (850,177) et « Relier » (849,297) sont des pilules noires (#000) sur une carte #1c1c1e, seulement cernées d'un filet ; tablette-paysage/back-office-fr-sombre.png : l'icône du bouclier (63,326) est un cercle noir sur la pastille #2c2c2e du bloc de modes, à peine distinct. Cause commune : bg-background vaut #000 en sombre (globals.css:251) et sert de fond « posé » dans src/components/ui/button.tsx:18 (variante outline) et SelecteurEspace.tsx:133 (segment actif sur bg-secondary).
- **back-office-6** — Trois idiomes de carte dans le même espace : filet, ombre, aplat gris (à regarder de près, effort moyen)  
  À faire, fiche d'équipe, colonne de droite de À faire · téléphone, tablette, ordinateur · fr-clair, fr-sombre.  
  *Correction* : Fixer deux rôles et s'y tenir : rangée de liste (filet) pour les listes d'actions, carte posée (raised) pour le reste, et mettre la colonne de droite dans l'un des deux ; c'est la moindre cohérence à demander à un espace de travail.  
  *Preuve* : telephone/back-office-fr-clair.png : rangées sous un filet, fond blanc ; telephone/taches-fr-clair.png : cartes à ombre douce sans filet (tâches, « Aucune réunion », « Personne ») ; ordinateur/back-office-fr-clair.png (1100 à 1400, 116 à 316) : « Ce dimanche » et « Prochaine réunion » en aplat gris, sans filet ni ombre. Code : AFaire.tsx:96 (border border-border bg-card), PageEquipe.tsx:40 (raised), ColonneDroite.tsx:17 (bg-secondary).
- **back-office-8** — Page Équipes (App) : aucun onglet de la barre du bas n'est actif (à regarder de près, effort petit)  
  Équipes (mode App) · téléphone, tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Allumer l'onglet « Moi » (ou l'entrée dont dépend la page) sur Équipes et ses fiches, pour qu'on sache où l'on est.  
  *Preuve* : tablette/equipes-fr-clair.png : barre du bas Chants, Setlists, Planning, Évènements, Moi, aucune en pastille noire ; telephone/equipes-fr-clair.png (barre posée à mi-page par la capture pleine page, mais ses entrées sont toutes grises). Code : PageEquipe.tsx:46-47 : hors Back-Office, le retour de la fiche d'équipe va vers « Moi », donc la page est rangée sous Moi.
- **back-office-5** — Équipes : la flèche ronde de défilement flotte au bout des filtres alors que ceux-ci passent à la ligne (finition, effort moyen)  
  Équipes (mode App), filtres d'équipe · ordinateur 1280, ordinateur 1440 (pointeur fin seulement) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Sortir les flèches de la rangée des filtres et les poser sur les cartes (bord droit du bandeau), ou les retirer sur ordinateur où la molette et le fondu suffisent ; en tout cas, ne pas mêler pilules à la ligne et flèche.  
  *Preuve* : ordinateur-1440/equipes-fr-clair.png : la rangée « Orga … Accueil J1 » repasse à la ligne (« Louange », « EDD » en dessous) et, en même temps, un bouton rond blanc « > » avec une ombre isolée s'affiche en (1378,167). Il fait défiler les colonnes de cartes, pas les pilules, mais il se lit comme un défilement des pilules. Code : BandeauEquipes.tsx:168-190 (flèches dans le nav de l'index, classe raised) et le commentaire :160-162.
- **back-office-10** — Fiche d'équipe en 1440 px : les tâches collées à gauche, « Nouvelle tâche » à l'autre bout, un grand vide entre les deux (finition, effort moyen)  
  Fiche d'équipe (Tâches, Réunions, Membres) · ordinateur 1440 (à moindre degré ordinateur 1280) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Sur ≥1024 px, passer la fiche en deux colonnes comme À faire (Tâches en 1fr, Réunions et Membres dans une colonne de 300 à 360 px), ou plafonner le corps à 720 px.  
  *Preuve* : ordinateur-1440/taches-fr-clair.png : la carte des tâches court de x=288 à 1400 (≈1 110 px), le texte de chaque tâche reste dans les 250 premiers px, le bouton « Nouvelle tâche » est en (1328,124) ; « Réunions » et « Membres » sont deux barres pleine largeur presque vides. Code : PageEquipe.tsx:93 (LargeurBO, plafond à --largeur-lecture 1 440 px, LargeurBO.tsx:5) ; l'accueil du même écran se resserre en deux colonnes (AFaire.tsx:56).
- **back-office-11** — Titre de fiche « DA » seul, alors que la liste dit « TEAM DA » (finition, effort petit)  
  Fiche d'équipe · toutes · fr-clair, fr-sombre (en chinois « 美工组 » est cohérent partout).  
  *Correction* : Reprendre le nom de la liste (« Team DA ») ou afficher en sous-titre la ligne de la carte (« Direction Artistique ») pour que le titre ne soit pas un sigle nu.  
  *Preuve* : telephone/taches-fr-clair.png (40,292) : h1 « DA » sans sous-titre ; telephone/equipes-fr-clair.png : la carte de la même équipe s'appelle « TEAM DA » avec « Direction Artistique » en dessous. Code : PageEquipe.tsx:48 (cleNomEquipe(id, true), forme courte) et :94 (sousTitre non rempli ici).
- **back-office-13** — Tablette portrait : « GCC Back-Office » répété à côté de l'onglet « Back-Office » (finition, effort petit)  
  Toutes les pages du Back-Office · tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Quand le sélecteur d'espace est affiché, ne garder que « GCC » (le sélecteur dit déjà l'espace), ou masquer le nom de marque dès sm.  
  *Preuve* : tablette/back-office-fr-clair.png : en haut à gauche, « GCC Back-Office » (Back-Office en rouge) à 20 px d'un onglet « Back-Office » dans le sélecteur. Code : Navbar.tsx:143 (le nom n'est masqué que sous 640 px).
- **back-office-4** — Page Équipes en bandeau : la dernière colonne est coupée au bord et le vide reste en dessous (à regarder de près, effort gros · *incertain*)  
  Équipes (mode App) ; la même logique servira à l'index Back-Office · ordinateur 1280, ordinateur 1440, tablette paysage (la tablette portrait est propre) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Sur ordinateur, rendre la colonne Louange à 290 px comme les autres, et soit ramener les cartes en grille sur la hauteur de la page (défilement vertical, plus de bandeau), soit équilibrer les colonnes pour que la coupe tombe sur un bord de colonne entière avec un fondu net.  
  *Preuve* : ordinateur-1440/equipes-fr-clair.png : la carte « TEAM LOUANGE » commence à x≈900 et se perd au bord de l'écran (x≈1435) sans respecter la marge droite ; les colonnes comptent 5, 6 et 1 cartes, et tout le bas de la page est vide. ordinateur/equipes-zh-clair.png : « 敬拜组 » à moitié visible, fondue. Code : BandeauEquipes.tsx:253-254 (colonne « large » à la moitié de la largeur) ; le défilement horizontal est voulu (en-tête du fichier, lignes 3-8, planches « equipes-* », Q12), ce qui explique l'effet mais pas le résultat.  
  *Contre-vérification* : ordinateur-1440/equipes-fr-clair.png : la carte Louange touche le bord droit et le bas de la page est vide. Le défilement horizontal est voulu par la spec (Q12) et le vide vient de données fictives avec peu de cartes. Le défaut est en partie voulu, je n'ai pas pu vérifier le reste.
- **back-office-7** — Équipes sur téléphone : les deux premiers niveaux de pilules ont le même habillage (finition, effort moyen · *incertain*)  
  Équipes (mode App) · téléphone, tablette portrait · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Mettre « Équipes / Musiciens » en contrôle segmenté (comme le sélecteur d'espace) ou en onglets soulignés, garder les pilules pour les filtres de contenu, et ajouter un fondu de 20 px au bord droit des rangées qui défilent.  
  *Preuve* : telephone/equipes-fr-clair.png : « Église » (y≈184) et « Équipes » (y≈239) sont deux pilules noires pleines de même taille, empilées, suivies de « Orga » plus petite (y≈305) ; trois rangées de pilules d'affilée avant la première carte. La coupe des rangées au milieu d'un mot (« Am », « Développer ») est une accroche de défilement acceptable, mais sans fondu. Code : BandeauEquipes.tsx:164-165 (l'index défile sans fondu).  
  *Contre-vérification* : Je n'ai pas ouvert telephone/equipes-fr-clair.png. L'empilement de pilules ressort d'un jugement de hiérarchie, pas d'un défaut net.
- **back-office-9** — Cibles tactiles trop petites : lien « ‹ Équipes » et boutons « Fait » / « Relier » (finition, effort petit · *incertain*)  
  Fiche d'équipe (retour), À faire (verbes) · téléphone, tablette (au toucher) · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Élargir la zone du retour par un after:-inset-y-3 comme le fait déjà le sélecteur, et passer les boutons de rangée à min-h-11 quand le pointeur est grossier.  
  *Preuve* : telephone/taches-fr-clair.png (40 à 200, 218) : « ‹ Équipes » en 14 px gris, hauteur d'environ 20 px, seul chemin de retour sur la page. Code : EnTetePage.tsx:27 (leading-5, aucune zone élargie) ; RangeeAFaire.tsx:40 (min-h-10 = 40 px, sous les 44 px demandés). Le sélecteur d'espace, lui, élargit sa zone par un ::after (SelecteurEspace.tsx:156).  
  *Contre-vérification* : Code confirmé : Retour (EnTetePage.tsx) en text-[14px] leading-5 sans zone élargie, et RangeeAFaire.tsx:40 en sm:h-10. Mais sur téléphone le bouton est h-auto min-h-10 avec py-1.5. Je n'ai pas mesuré la zone réelle ni vérifié la capture, donc la gravité reste à établir.
- **back-office-12** — Téléphone en français : coupes de lignes disgracieuses sur l'accueil (finition, effort petit · *incertain*)  
  À faire · téléphone · fr-clair, fr-sombre (en chinois chaque ligne tient).  
  *Correction* : Ajouter text-pretty (ou text-balance) sur les sous-titres, et raccourcir le texte français de la porte (« Réservations et ordre de passage » seul suffit).  
  *Preuve* : telephone/back-office-fr-clair.png : le sous-titre de « Scène des fêtes » passe à la ligne en laissant « Noël » seul (194, 652) ; « Noms du planning sans compte » tient sur deux lignes, serré contre « Relier » (194 à 723, 1175 à 1230). Code : AFaire.tsx:73 (break-words, sans équilibrage) ; RangeeAFaire.tsx:40 (max-w-[8.5rem] pris sur le titre).  
  *Contre-vérification* : telephone/back-office-fr-clair.png : « Noël » est bien seul sur sa ligne et « Noms du planning sans compte » passe sur deux lignes. C'est cosmétique et dépend du texte. Je n'ai pas vérifié le code cité.
- **back-office-14** — Équipes en bandeau : espaces verticaux inégaux entre sous-titre, filtres et cartes (finition, effort petit · *incertain*)  
  Équipes (mode App) · ordinateur 1280, ordinateur 1440, tablette paysage · fr-clair, fr-sombre, zh-clair.  
  *Correction* : Un seul pas vertical entre les trois blocs (16 px) et un gap-y de 8 px entre rangées de pilules.  
  *Preuve* : ordinateur-1440/equipes-fr-clair.png : sous-titre (y=74) à première rangée de pilules (y=109) ≈ 35 px, première rangée à « Orga » (y=165) ≈ 56 px, « Orga » aux cartes (y=244) ≈ 35 px entre bords. Mesure faite à l'œil sur la capture, à confirmer au sélecteur. Code : BandeauEquipes.tsx:157 (gap-3 du conteneur, sm:gap-y-3.5 dans l'index).  
  *Contre-vérification* : ordinateur-1440/equipes-fr-clair.png : les espaces entre sous-titre, filtres et cartes paraissent inégaux, mais la mesure est à l'œil et je ne l'ai pas confirmée au sélecteur.