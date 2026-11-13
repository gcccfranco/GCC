# Annexe de spec · corrections du design · groupe Services

Source : planche `docs/planches/planche-corrections-services.html` ; décisions : recommandations (Timothée, 03/11/2026)

Sept constats retenus (services-5 écarté : décision voulue de `docs/spec-pages-en-grand.md:373` ; services-7 écarté : `flex-auto` voulu de la barre d'onglets ; services-10 gelé : mot de marque contextuel). Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| services-1 | T1 | petit |
| services-2 | T1 | moyen |
| services-3 | T1 | petit |
| services-6 | T1 | petit |
| services-9 | T1 | petit |
| services-4 | T4 | petit |
| services-8 | T4 | petit |

Ordre dans T1 : services-1 avant services-2 (services-2 passe par le composant `PastilleRole` créé par services-1). Ordre dans T4 : services-4 avant services-8 (la grille de services-8 est celle de services-4). T2, T3 et T5 : aucun constat de ce groupe en propre. Pourquoi T4 pour services-4 et services-8 : ils appliquent la règle de largeur L1 (blocs en `auto-fill minmax(280px, 1fr)`, liste alignée sur `--marge-page`, sans centrage), c'est un exemple du chantier ; services-3 ne l'est pas (le défaut est le poids du cadre pointillé), il reste en T1 et pose localement les 720 px.

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte, jamais par `json.dump`.
- Zones gelées intactes : la couleur du service vient de `serviceColor` (`src/lib/serviceColors.ts`), sa variante sombre de `couleurSombre` (`styleTexteService`, classe `.texte-service`) ; le bleu des pastilles de tonalité (`KeyPill`, `--fr-accent`) ne bouge pas.
- Aucun nom réel de membre dans les tests : noms fictifs (ceux de la planche, « Alix D. », « Zoé F. »…, sont des noms de dessin ; pour un test, en inventer).
- Les commandes existantes de 40 px (« Ouvrir », « Mode Louange ») ne sont pas redimensionnées ici : elles restent hors lot (44 px réservé aux commandes créées ou redimensionnées).

---

### services-1 · Pastille « Piano » presque invisible en sombre dans la liste
- Tranche : T1
- Décision : A, une seule pastille de rôle, partagée entre la liste et le détail (`PastilleRole`).
- À faire :
  - `src/components/mesServices/DetailService.tsx:38-49` : extraire `Roles` en un composant exporté `PastilleRole` (nouveau fichier `src/components/mesServices/PastilleRole.tsx`, `DetailService.tsx` l'importe). Il garde la recette actuelle : `rounded-full px-2 py-0.5 text-xs font-semibold texte-service`, fond `color-mix(in srgb, <couleur du service> 13%, transparent)`, texte par `styleTexteService(couleur)`. Taille 12/16 semi-gras (cran xs de l'échelle B ; aujourd'hui `text-xs` vaut 11/14 dans `tailwind.config`, le passage à 12/16 est fait par T4 : ne rien coder de spécial ici), 20 px de haut, 8 px de marge latérale.
  - Paramètre `actif` : sur la ligne active, le fond devient `bg-background` (blanc en clair, noir en sombre) et le texte garde `texte-service`.
  - `src/components/mesServices/ListeMesServices.tsx:166-176` : remplacer le `<span>` écrit à la main (`style={{ background: color-mix(… 13% …), color }}`, qui pose la couleur brute `color` en texte, et `actif && "!bg-background"`) par `<PastilleRole>`. Le `color` brut est la cause : l'en-tête du détail passe par `texte-service` et se lit.
  - `DetailService.tsx:110` (répétition) reprend aussi `PastilleRole` (même rendu, plus de duplication).
  - Aucune clé de langue.
- Critères : en sombre, ordinateur et tablette paysage, la pastille « Piano » de la ligne inactive se lit à 4,5:1 au moins sur sa propre pastille (planche : 6,6:1 mesuré sur le dessin) et celle de la ligne active à 4,5:1 au moins sur le noir (8,8:1 mesuré sur le dessin) ; aujourd'hui 2,1:1 et 2,8:1. Clair : rien ne change. Regarder en passant la liste au téléphone (390 px) et en tablette portrait (820 px), non capturées dans la planche, même composant, avec le chevron. Français et 中文 (la pastille est traduite par services-2).
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` (déjà sur les cinq projets via `/pages-en-grand-.*\.spec\.ts/`) : en thème sombre, lire la couleur calculée du texte de la pastille de rôle de la liste et celle du fond, calculer le contraste (>= 4,5), sur ligne active et inactive ; vérifier que la couleur du texte égale celle de la pastille de l'en-tête du détail pour le même service.
- Points de vigilance de la planche : la liste du téléphone et de la tablette portrait n'a pas été capturée (le défaut y est probable) ; cas chargés non vus : un service à plusieurs rôles (deux pastilles), un service avec répétition (Campus).

### services-2 · En 中文, rôle et nom du service restent en français
- Tranche : T1
- Décision : B, traduire le rôle et le nom du service, et un seul nom de service partout, en français aussi (« Culte Francophone » / 法语崇拜, au lieu de « Culte Franco » du planning). Décision confirmée : « Culte Francophone » partout (la planche proposait A en repli si le libellé du planning devait rester ; il ne reste pas).
- À faire :
  - Nom du service : créer `nomDuService(service, t)` (dans `src/lib/planning/names.ts`, à côté de `serviceCategory`, ligne 364, ou dans `PastilleRole.tsx` si on préfère rester dans `src/components/mesServices/`). Pour `Culte Franco` (→ `Culte Francophone`), `Groupe …`, `Intergroupe` et `Interfranco`, renvoyer `t("categories." + serviceCategory(service), { defaultValue: service })` ; pour tout autre libellé, le renvoyer tel quel. Clés existantes : `categories.*` (`fr.json:628`, `zh-CN.json:624`) ; rien à créer.
  - Appels à remplacer : `ListeMesServices.tsx:149` (`{e.service}`) et l'`aria-label` de `:142` (`${e.service}, ${date}`) ; `DetailService.tsx:89` (`{s.service}`) et `:106` (`{r.service}`, répétition).
  - Rôle : table « libellé du planning -> clé » (dans `PastilleRole.tsx`), valeurs de `CULTE_ROLES`, `GROUPE_ROLES`, `FIDELITE_ROLES`, `EDD_ROLES_COLS`, `INTERGROUPE_ROLES`, `INTERFRANCO_ROLES` (`src/lib/planning/names.ts:171-193`) : Présidence -> `presidence`, Choriste -> `choristes`, Piano -> `piano`, Guitare -> `guitare`, Batterie -> `batterie`, Sono -> `sono`, PPT -> `ppt`, Orateur -> `orateur`, Traduction -> `trad`, Sainte cène -> `sainteCene`, Musicien -> `musiciens`, Percussion -> `percussion`, Suppléant -> `suppleant`, Cajon -> `cajon`, Cajon/Batterie -> `cajonBatt`, Cours -> `cours`, Équipe -> `equipe`. Clés `planning.roles.*` existantes (`fr.json:1303`, `zh-CN.json:1275`), mêmes que celles de `src/lib/setlist/equipeDuService.ts` : le rôle a le même nom dans la pastille et dans le tableau de l'équipe (钢琴, 吉他, 架子鼓, 和声, 司会, 音控, 投影, 讲员, 翻译).
  - Planche corrigée sur deux points. (1) En français la pastille reste le libellé brut du planning : la planche dit « en français, rien ne change », or `planning.roles.choristes` vaut « Choristes » (pluriel) pour le libellé brut « Choriste » ; ne passer par la table que si `i18n.language === "zh-CN"`, sinon renvoyer le libellé brut. (2) Le texte de la planche écrit `t("categories." + serviceCategory(s.service))` pour tout service : or `serviceCategory("Campus (soir)")` renvoie « Campus » et `serviceCategory("EDD 中班")` renvoie « 中班 », ce qui ferait perdre « (soir) », « (matin) », « (répét.) » et « EDD ». D'où la liste fermée ci-dessus ; Campus et EDD restent donc en français tels quels (hors planche, à rouvrir si Timothée veut aussi les traduire).
  - Rôles absents de `planning.roles` : « Chant » et « Régie » (Campus, `names.ts:346-350`) n'ont pas de clé ; `defaultValue` garde le libellé brut. Hors planche, ne pas créer de clé sans demande.
  - Le titre de la setlist (« Culte du 8 novembre ») est une donnée saisie : on n'y touche pas.
  - Les URL gardent le nom brut (`?service=Culte%20Franco`, `adresseDuService` dans `src/lib/planning/mesServices.ts`) : seule l'étiquette affichée change.
- Critères : 中文, clair (le sombre en 中文 n'a pas été capturé : le regarder), ordinateur, tablette paysage, téléphone : liste, en-tête du détail et répétition montrent 法语崇拜 et 钢琴 ; plus aucun « Culte Franco » ni « Piano » en français dans ces trois endroits. Français : « Culte Francophone » partout (liste, détail, Setlists, Nouvelle setlist), rôles inchangés (« Piano »). Au téléphone en français, le titre « Culte Francophone » tient sur une ligne et la puce « dans 6 j » passe sous lui sur la ligne du jour (colonne de texte de 161 px) : c'est voulu (planche).
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` : les regex `/Culte Franco.*4 oct/` des lignes 125, 142, 144, 147, 158, 177, 191 et `getByText("Culte Franco")` de la ligne 206 deviennent `Culte Francophone` ; ne pas toucher aux assertions pures sur `adresseDuService` (lignes 68-99, elles lisent la donnée brute). Ajouter un test en `zh-CN` (langue posée comme dans les autres specs) : la ligne de liste contient 法语崇拜 et 钢琴, jamais « Culte Franco ». Un test pur sur la table des rôles : chaque libellé de `CULTE_ROLES`, `GROUPE_ROLES`, `FIDELITE_ROLES`, `EDD_ROLES_COLS`, `INTERGROUPE_ROLES`, `INTERFRANCO_ROLES` a une clé (hors « Chant », « Régie »).
- Points de vigilance de la planche : la table de correspondance est à tenir à jour quand une colonne du planning change ; le libellé « Culte Francophone » est plus long (environ 125 px au lieu de 95 px) ; les cas plus chargés (service à plusieurs rôles, répétition Campus, nom d'équipe plus long) n'ont pas été vus.

### services-3 · Nouvelle setlist vide : le cadre pointillé pèse plus que les deux actions
- Tranche : T1
- Décision : A, une phrase d'une ligne, puis les deux entrées en liste groupée dans une colonne de 720 px au plus.
- À faire :
  - `src/app/setlists/new/PourQuelService.tsx:78-81` (état `etat.length === 0`) : supprimer l'`EtatVide` (cadre pointillé). Sans service, la ligne sous le titre « Pour quel service ? » (`:67-70`, `text-[17px] font-bold`) devient la phrase `setlists.entree.aucunService` en 13/18 gris (`text-sm text-muted-foreground`, `mt-1`), à la place de `pourQuelServiceHint`.
  - Avec des services : la même ligne `:70` reprend `pourQuelServiceHint` raccourci à une ligne. Les deux textes sont des clés existantes à modifier, pas des clés nouvelles (la planche parle de « deux phrases nouvelles ») :
    - `setlists.entree.aucunService` — `fr.json:499` : « Le planning n'a aucun service à venir sans setlist dans tes catégories. » ; `zh-CN.json:495` : « 排班表中，你的聚会类型暂无未准备歌单的聚会。 »
    - `setlists.entree.pourQuelServiceHint` — `fr.json:491` : « D'après le planning : service, date et présidence déjà remplis. » ; `zh-CN.json:487` : « 根据排班表，聚会、日期和主席会自动填好。 » (Timothée tranche « 主席 », celui de `setlists.entree.presidence`, `zh-CN.json:490`, et non « 主领会 ».)
  - Les deux entrées « Autre setlist » et « Repartir d'une setlist passée » (`:125-143`, aujourd'hui `<ul className="mt-6 grid md:grid-cols-2 md:gap-x-8">` avec `border-t border-border` par rangée) deviennent une seule carte : `<ul>` en `raised rounded-2xl` (rayon 16, recette de carte actuelle ; T2 la fera passer en groupe blanc sans ombre), `mt-3` (12 px), `max-w-[720px]` aligné à gauche, rangées séparées par un filet interne (`divide-y divide-border/70`), sans `grid`. Rangée : `min-h-14` (56 px) au moins, icône 36 px (`h-9 w-9`, déjà), titre 15/21 semi-gras (déjà `text-[15px] font-semibold`), sous-titre 13/18 gris (déjà `text-sm`), chevron conservé.
  - Dans les deux états la carte est la même (avec services, elle est sous la liste des cartes « Préparer » ; l'ordre de la page ne change pas). Les cartes « Préparer » (`:83`) se rangent en `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` à la place de `md:grid-cols-2 lg:grid-cols-3`, écart 16 px, dans le même plafond de 720 px (règle L1 ; si T4 n'a pas encore fixé la règle, poser ce plafond ici, T4 l'uniformisera).
  - Le bouton « Préparer » (`:114`, `h-9`) n'est pas redimensionné ici.
- Critères : téléphone (390 px), tablette portrait (820 px), ordinateur (zone de contenu 1 280 px), clair, sombre, français et 中文, sans service : un titre, une phrase d'une ligne, une carte à deux rangées, plus de cadre pointillé ; au téléphone le premier geste remonte d'environ 100 px CSS (planche) ; à 1 440 px la carte mesure 720 px au plus, alignée à gauche (la moitié droite reste vide, c'est assumé). Avec des services (état non capturé dans la planche, le jeu de test n'en contient pas : le fabriquer dans le test) : l'explication tient en une ligne, les cartes « Préparer » ne dépassent pas 720 px, les deux entrées restent dessous.
- Test : adapter `tests/setlist-pour-quel-service.spec.ts` : ligne 369, `getByText("Aucun service à venir sans setlist dans tes catégories.")` devient la nouvelle phrase ; ajouter une assertion « plus de cadre pointillé » (aucun élément `border-dashed` dans la section) et `boundingBox().width <= 720` de la carte des deux entrées à 1 440 px. Ajouter `/setlist-pour-quel-service\.spec\.ts/` à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`) : la spec teste maintenant un agencement et ne tourne aujourd'hui que sur trois appareils (le fichier n'y figure pas).
- Points de vigilance de la planche : sur ordinateur, la moitié droite reste vide (assumé, comme dans la planche « Partout ») ; l'état avec services n'a jamais été capturé.

### services-6 · Pastille du rôle collée au bord droit, loin du titre
- Tranche : T1
- Décision : A, la pastille toujours sous le titre, dans toutes les dispositions.
- À faire :
  - `src/components/mesServices/DetailService.tsx:93` : retirer la condition `!deuxVolets &&` autour de `<Roles s={s} />` (devenu `<PastilleRole>` après services-1) : la ligne « dans 6 jours · [Piano] » (8 px d'écart, `gap-x-2`) existe alors en un volet comme en deux volets.
  - `DetailService.tsx:97` : supprimer `{deuxVolets && <div className="shrink-0 pt-1"><Roles s={s} /></div>}`.
  - `deuxVolets` reste utilisé ailleurs dans le composant (`Titre` ligne 78, ordre des cartes ligne 116) : ne pas retirer le hook.
  - Aucune clé de langue.
- Critères : ordinateur 1 280 px, tablette paysage (volet de 528 px) et 1 440 px (volet de 688 px) : la pastille est sur la ligne « dans 6 jours », à 8 px du texte, plus à 320 px du titre ; téléphone et tablette portrait inchangés ; clair, sombre, français, 中文.
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` : en deux volets, la pastille de rôle de l'en-tête a le même parent que « dans N jours » (ou son `boundingBox().x` est à moins de 16 px de la fin de ce texte) ; sur une disposition à un volet, même assertion.
- Points de vigilance de la planche : les cas à plusieurs rôles (deux pastilles) et avec répétition éprouveraient cette ligne ; la ligne passe à la ligne suivante (`flex-wrap`) si elle déborde.

### services-9 · Au téléphone, le titre du détail se casse
- Tranche : T1
- Décision : A, le titre descend à `xl` (22/27) au téléphone, `2xl` (30/34) dès la tablette en un volet, `xl` en deux volets.
- À faire :
  - `src/components/mesServices/DetailService.tsx:90` : la classe du titre `deuxVolets ? "text-[24px]" : "text-2xl lg:text-[28px]"` devient `deuxVolets ? "text-xl" : "text-xl md:text-2xl"`. Les paliers `xl` et `2xl` existent dans `tailwind.config` (`fontSize.xl` 22/27, `fontSize["2xl"]` 30/34) : aucune valeur à créer. `text-[24px]` et `text-[28px]` sont hors échelle (le chantier d'échelle T4 les aurait supprimés).
  - Mettre à jour le commentaire d'en-tête (`DetailService.tsx:8`, « le titre est un h2 de 24 px ») : « de 22 px (`xl`) ».
  - Aucune clé de langue.
- Critères : téléphone (390 px) : « Dimanche 8 novembre » (environ 210 px) sur une ligne à côté de la tuile (il reste 286 px), l'en-tête gagne environ 34 px CSS ; tablette portrait : une ligne en 30/34 ; deux volets (ordinateur 1 280 px, tablette paysage, 1 440 px) : 22/27. 中文 : « 11月8日星期日 » reste sur une ligne. Clair, sombre.
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` : au téléphone, la hauteur du `h1` du détail correspond à une ligne (`boundingBox().height <= 34`) ; `getComputedStyle(...).fontSize` est `22px` au téléphone et en deux volets, `30px` en tablette portrait.
- Points de vigilance de la planche : au téléphone le titre devient plus petit que les titres de page (30 px) ; le passage de `text-[24px]` à `xl` en deux volets relève de l'échelle de texte (T4), il est fait ici parce que la même ligne est touchée.

### services-4 · Détail : boutons empilés et noms coupés selon la largeur
- Tranche : T4
- Décision : C, les cartes suivent la règle L1 et les boutons s'adaptent à l'intérieur (règle de B).
- À faire :
  - `src/app/globals.css:605-609` : le bloc `@container (min-width: 520px) { .service-colonnes { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); } }` est remplacé par `.service-colonnes { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }` hors requête de conteneur, écart de 16 px (`gap-4`, déjà posé par `DetailService.tsx:115`). Mettre à jour le commentaire au-dessus (« le seuil à 520 px »). `.service-detail { container-type: inline-size }` peut rester (il n'est plus utile à cette règle ; vérifier avant de le retirer qu'aucune autre règle ne s'en sert).
  - `src/components/mesServices/DetailService.tsx:134` : `flex flex-wrap gap-2 [&>a]:flex-1 [&>a]:justify-center sm:[&>a]:flex-none` devient `flex flex-wrap gap-2 [&>a]:flex-[1_1_136px] [&>a]:justify-center` (on retire `sm:[&>a]:flex-none`) : côte à côte à parts égales quand la carte offre au moins 280 px de contenu, sinon empilés sur toute la largeur. L'ordre « Ouvrir » puis « Mode Louange » du code reste ; la hauteur `h-10` reste.
  - Le code de la page n'a pas besoin d'autre classe : l'ordre des cartes (setlist d'abord en deux volets, équipe d'abord en un volet, `:116`) est inchangé.
  - Aucune clé de langue.
- Critères : volet de 528 px (ordinateur 1 280 px, tablette paysage) : une colonne, setlist puis équipe, chacune sur 528 px, boutons de 240 px côte à côte ; volet de 688 px (1 440 px) : deux colonnes d'environ 336 px, boutons de 140 et 147 px dans 296 px de contenu (cela tient sans marge ; si une police plus large les fait passer l'un sous l'autre, c'est correct) ; tablette portrait (720 px de contenu) : deux colonnes égales de 352 px (au lieu de 1,25 / 1), boutons de 152 px ; téléphone : une colonne, inchangé. « Mathis R., Lina O. » (fictif dans la planche) tient sur une ligne dès que la carte équipe fait 336 px. 敬拜模式 tient partout. La carte équipe remonte à côté de la setlist dès que le volet atteint 576 px (2 x 280 + 16). Clair, sombre, français, 中文.
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` (cinq projets) : les tests de la ligne 133 et suivantes (« Côte à côte : la setlist à gauche, l'équipe à droite ») supposent deux colonnes à 1 280 px, ce qui n'est plus vrai (une colonne à 528 px) ; les réécrire par disposition : 1 280 px et paysage -> setlist au-dessus de l'équipe, mêmes `x` ; 1 440 px et portrait -> côte à côte ; dans tous les cas, `boundingBox()` des deux boutons : même `y` (côte à côte) ou même `x` et largeur de la carte (empilés), jamais de bouton coupé (`scrollWidth <= clientWidth`).
- Points de vigilance de la planche : à 1 280 px la carte équipe passe sous la setlist et demande un défilement (décision actée : la setlist, avec « Mode Louange », est ce qu'on vient chercher) ; à 1 440 px les boutons tiennent sans marge ; cas chargés (nom d'équipe plus long, deux pastilles) non vus.

### services-8 · Marge gauche qui change d'une page à l'autre sur tablette portrait
- Tranche : T4
- Décision : A, marge de page et largeur selon le contenu (règle L1) ; B (passer par `EnTetePage`) écarté.
- À faire :
  - `src/components/mesServices/DetailService.tsx:83` : `!deuxVolets && "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6"` devient `!deuxVolets && "px-[var(--marge-page)] pt-3"` : plus de centrage ni de largeur de 768 px. `--marge-page` vaut 16 px au téléphone (déjà la valeur actuelle de `px-4`, rien ne change là) et 24 px en tablette portrait (aujourd'hui 45 px).
  - Les cartes suivent la grille `auto-fill minmax(280px, 1fr)` de services-4 (même classe `service-colonnes`, `:115`) ; à faire après services-4.
  - Le lien retour `<Retour>` (`:84`) suit le même padding : il est dans le conteneur, rien à ajouter.
  - Aucune clé de langue.
- Critères : tablette portrait (820 px), clair et sombre : le lien « Mes services » et la tuile commencent à x = 24 px CSS, comme le lien retour et le titre de Nouvelle setlist (`EnTetePage`, `px-[var(--marge-page)]`) ; contenu de x 24 à 786 px, deux cartes d'environ 373 px. Téléphone inchangé (16 px). Vérifier en 1 440 px et paysage que la page à un volet n'est pas affectée (ils sont en deux volets, la condition `!deuxVolets` ne s'y applique pas).
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` (portrait) : `boundingBox().x` du lien retour du détail et de la tuile égal à 24 ; comparer à celui du lien retour de `/setlists/new` (même disposition) sans écart.
- Points de vigilance de la planche : B ne se justifierait que si d'autres pages de détail avaient le même écart, ce qui n'a pas été vérifié ; le calcul de la planche (45 px = centrage d'une colonne de 768 px dans 810 px, plus 24 px) vient bien de la ligne 83.
