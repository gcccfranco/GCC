# Annexe de spec · corrections du design · groupe Musiciens

Source : planche `docs/planches/planche-corrections-musiciens.html` ; décisions : recommandations (Timothée, 03/11/2026)

Onze constats retenus (aucun écarté ni gelé dans ce groupe ; rien ne touche une zone gelée, `--chord-color` reste cité en repère). Un constat qui n'est qu'un exemple d'un chantier va dans la tranche du chantier. Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| musiciens-3 | T1 | petit |
| musiciens-4 | T1 | petit |
| musiciens-5 | T1 | petit |
| musiciens-6 | T1 | petit |
| musiciens-7 | T1 | petit |
| musiciens-8 | T1 | petit |
| musiciens-11 | T1 | petit (les deux `<select>` seront remplacés en T3 : voir l'entrée) |
| musiciens-12 | T1 | petit (à valider à l'œil) |
| musiciens-2 | T3 | moyen (dépend du menu unique du chantier 3) |
| musiciens-9 | T4 | petit |
| musiciens-10 | T5 | petit pour A ; moyen et hors code pour B (traductions à faire relire) |

Répartition : T1 = 8 entrées, T2 = 0, T3 = 1, T4 = 1, T5 = 1.

Ordre dans T1 : musiciens-3 avant musiciens-6 (même fichier, la racine de la fiche) ; musiciens-4 touche `Pilules`, composant partagé : regarder aussi les autres écrans qui l'emploient. musiciens-2 (T3) vient après la livraison du menu unique ; il retire aussi le bloc `md:hidden` de `Catalogue.tsx`, donc musiciens-3 (le `space-y-5` de la même racine) doit être passé avant.

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte à la bonne place (bloc `harmonie` à partir de la ligne 2908 de chaque fichier), jamais par `json.dump`. Pluriels : suffixes `_one` / `_other` comme `sousTitre_one` ; le chinois n'a que `_other`.
- Les 69 fiches et les 12 familles de l'index actuel sont « à relire » : les chiffres de la planche (7 autres, 43 autres, 10 fiches) viennent des données du 03/11/2026 et se calculent, ils ne s'écrivent pas en dur.
- Les commandes de 36 à 40 px existantes hors de ce groupe restent hors lot ; seules les commandes créées ou redimensionnées ici passent à 44 px au doigt.
- Aucun nom réel de membre dans les tests : noms fictifs. Les tests d'Harmonie entrent avec `JO` / `RUTH` (comptes simulés de `tests/helpers/fakeSession.ts`).
- Dispositions : téléphone, tablette portrait, tablette paysage, ordinateur, plus 1 440 px pour une page de lecture ; clair et sombre ; français et 中文. Les specs d'Harmonie qui ne sont pas dans `SPECS_GRAND_ECRAN` (`harmonie-catalogue.spec.ts`, `accords-*.spec.ts` sauf `accords-page`) ne tournent que sur trois appareils : toute mesure d'agencement va dans `tests/pages-en-grand-harmonie.spec.ts` (déjà dans la liste) ou dans une spec ajoutée à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`).

---

### musiciens-3 · Bande vide de 44 px et deux interrupteurs Piano / Guitare
- Tranche : T1
- Décision : correction recommandée, un seul interrupteur (celui de la liste) et une bande ramenée à 16 px.
- À faire :
  - `src/components/harmonie/Catalogue.tsx:147` : remplacer `space-y-5` par `flex flex-col gap-5` (un `gap` ignore les enfants en `display:none`, alors que `space-y` compte le bloc `md:hidden` de la ligne 151 comme voisin) et `pt-6` par `pt-4` dans la branche `deuxVolets` (`px-5 pt-6 pb-10` devient `px-5 pt-4 pb-10`). La bande passe de 44 à 16 px à l'ordinateur.
  - `src/components/harmonie/FicheHarmonie.tsx:116` : retirer `{deuxVolets && choixInstrument && <div className="shrink-0">{choixInstrument}</div>}`. L'interrupteur de la liste (`Catalogue.tsx:179`, `OngletsRail`) reste ; l'état `instrument` est déjà partagé entre les deux volets. La ligne 123 (`{!deuxVolets && choixInstrument}`) ne change pas : un seul volet, un seul interrupteur, celui de la fiche.
  - Vérifier que le conteneur `flex` de l'en-tête (autour de la ligne 105 : titre + interrupteur) n'a plus de `justify-between` orphelin une fois l'interrupteur retiré.
  - Aucune clé de langue.
- Critères : à l'ordinateur et en tablette paysage (deux volets), une seule paire Piano / Guitare visible (dans la liste), 16 px entre le haut du volet de liste et sa première rangée (44 px avant), titre de la fiche sur toute la largeur de son volet. Téléphone et tablette portrait : inchangés (interrupteur de la fiche seul, sa position actuelle). 1 440 px compris, clair et sombre, français et 中文.
- Test : `tests/pages-en-grand-harmonie.spec.ts` (déjà en grand écran) : sur les dispositions à deux volets, `getByRole("group", { name: "Piano" })` ne compte qu'un élément visible avec une fiche ouverte, et le premier enfant visible du volet de liste est à 16 px de son haut ; sur téléphone et tablette portrait, il en reste un seul, dans la fiche.
- Points de vigilance de la planche : l'alternative (garder celui de la fiche, à côté de « Au piano » qu'il change, et retirer celui de la liste) n'est pas retenue. Le dessin « après » vient du code lu, pas d'un appareil.

### musiciens-4 · Rangées de pastilles coupées net
- Tranche : T1
- Décision : correction recommandée, brancher le fondu latéral existant sur `Pilules` ; le bouton « › » à la souris n'est pas retenu.
- À faire :
  - `src/components/layout/Onglets.tsx:154` (`Pilules`) : prendre `const rangee = useFonduLateral<HTMLElement>(options.length)` (`src/hooks/useFonduLateral.ts`, même usage qu'à `src/components/layout/SectionTabs.tsx:39` et `:147`), poser `ref={rangee}` sur `Rangee` (ligne 173-178) et ajouter la classe `fondu-lateral` (définie à `src/app/globals.css:30`) à la `className` de la ligne 178. Penser à la `Rangee` polymorphe (`nav` ou `div`) : le type du `ref` doit accepter les deux (`HTMLElement`, comme `SectionTabs`).
  - Aucune clé de langue.
  - Effet de bord voulu : toutes les rangées qui emploient `Pilules` en profitent (une vingtaine de fichiers, dont Statistiques, Planning, Personnes, Messages). Les regarder sur les quatre dispositions : à 0, le masque est de longueur nulle, rien ne doit changer pour une rangée qui tient.
  - Le planning est à regarder aussi : `src/components/planning/PlanningTabs.tsx`, `BarreDeGrille.tsx`.
- Critères : une rangée de pastilles plus large que son conteneur s'estompe du côté où il reste quelque chose (sensations d'Harmonie à 390 et 820 px) ; aucune pastille n'est tranchée en deux au bord ; une rangée qui tient (Piano / Guitare) n'a aucun masque. Clair, sombre, français, 中文 (rangée de sensations plus courte en chinois).
- Test : étendre `tests/retouches-v18-pilules-stats.spec.ts` (déjà en grand écran) : sur le catalogue d'Harmonie, la rangée « Sensation » porte `fondu-lateral` et `--fondu-droite` > 0 au chargement, `--fondu-gauche` > 0 après défilement à fond ; une rangée sans débordement a les deux à 0.
- Points de vigilance de la planche : le défilement de la rangée est horizontal et tactile sur téléphone ; vérifier que le masque ne gêne pas le clic sur la dernière pastille visible.

### musiciens-5 · Coupures de ligne : « pouce » ou « 5. » seuls, guillemets en fin de ligne
- Tranche : T1
- Décision : correction recommandée, éléments insécables et `text-wrap: pretty` ; la légende en grille de deux colonnes n'est pas retenue.
- À faire :
  - Légende des doigts : chaque doigt devient un bloc insécable (`<span class="whitespace-nowrap">`) dans la légende, c'est-à-dire la clé `accords.doigtsLegende` (rendue à `src/components/accords/PanneauAccord.tsx:274`) et `accords.legendePouce` (même fichier, ligne ~201). Découper le texte de la clé en éléments (« 1 index · 2 majeur · … · P pouce » / « 4 小指 », « P 拇指 ») ou lier chaque couple par des espaces insécables (U+00A0) dans `fr.json` et `zh-CN.json` ; au choix du codeur, le plus petit des deux, mais les deux langues.
  - `src/app/globals.css` : `text-wrap: pretty` sur `[data-fiche] p`, `[data-fiche] li` et sur les légendes des accords (`.accords-legende` à créer, ou la classe déjà portée par les `<p>` des lignes 199 et 266 de `PanneauAccord.tsx`).
  - `src/components/harmonie/TexteFiche.tsx:17` (`TexteFiche`) : au rendu, remplacer l'espace après « « » et avant « » » (et avant `?`, `!`, `:`, `;`) par une espace insécable fine (U+202F) ou U+00A0, sans toucher aux fichiers `docs/harmonie/*.md`. Idem pour « 2m7 → 5. » : lier la flèche à ses deux voisins par U+00A0.
  - Aucune nouvelle clé de langue si la légende est découpée en éléments ; sinon deux clés modifiées.
- Critères : sur la page Accords (`/accords`) en guitare, « P pouce » ne se coupe jamais ; dans une fiche, aucun « 5. » ni aucun guillemet ouvrant seul en fin de ligne, à 390, 820 et 1 280 px ; le texte copié garde ses espaces normales. En 中文 : regarder la coupure « G）。 » (jamais vue) et ne pas laisser une ponctuation chinoise seule en début de ligne. Clair, sombre.
- Test : `tests/accords-page.spec.ts` (déjà en grand écran) pour la légende ; `tests/harmonie-catalogue.spec.ts` (test « une fiche montre avant → après… », ligne 80) pour les guillemets : le texte rendu contient U+00A0/U+202F à la place des espaces et le contenu textuel lu par `getByText` n'est pas altéré.
- Points de vigilance de la planche : `text-wrap: pretty` ne garantit pas qu'une ponctuation chinoise ne reste pas seule en début de ligne ; à regarder sur la fiche en 中文 au téléphone une fois la correction posée.

### musiciens-6 · Colonnes déséquilibrées à 1 280 px
- Tranche : T1
- Décision : correction recommandée, la grille de la fiche décide d'après la largeur du volet (conteneur), plus d'après la disposition ; déplacer « Quand l'éviter » n'est pas retenu.
- À faire :
  - `src/components/harmonie/FicheHarmonie.tsx:94-96` (racine `data-fiche`) : ajouter `@container` à la `className`.
  - `src/components/harmonie/FicheHarmonie.tsx:151` : remplacer `deuxVolets ? "grid-cols-2" : "md:grid-cols-2"` par `[@container(min-width:640px)]:grid-cols-2` (le motif existe à `src/components/accueil/CeDimanche.tsx:100`). Un volet de 528 px (moins de 640 px) tombe en une seule colonne, les cartes se suivent sans trou.
  - Vérifier que la grille parente reste `items-start gap-4`. Le même constat vaut pour la grille des exemples (`FicheHarmonie.tsx:229`, `deuxVolets ? "grid-cols-2 gap-x-8 min-[1440px]:grid-cols-3" : "md:grid-cols-2 md:gap-x-8"`) : à passer au conteneur aussi si elle présente le même défaut (à regarder ; hors planche, ne pas la modifier sans le voir).
  - Aucune clé de langue.
- Critères : tablette paysage et ordinateur à 1 280 px : volet de fiche de moins de 640 px, une colonne, aucun trou entre « Pourquoi ça marche », « Au piano » et « Quand l'éviter » ; ordinateur à 1 440 px et tablette portrait (fiche plein écran, plus de 640 px) : deux colonnes. Clair, sombre, français, 中文.
- Test : `tests/pages-en-grand-harmonie.spec.ts` : ouvrir une fiche sur les cinq projets, lire la largeur du volet de fiche et compter les colonnes (`getComputedStyle(grille).gridTemplateColumns`) : 1 si largeur < 640, 2 sinon.
- Points de vigilance de la planche : la capture de référence (`ordinateur/harmonie-fr-sombre.png`) a été lue à la place de `fr-clair`, prise pendant le fondu d'entrée du volet.

### musiciens-7 · Titres coupés et trous sur tablette portrait
- Tranche : T1
- Décision : correction recommandée, titres sur deux lignes et deux colonnes qui se lisent colonne par colonne ; la grille `items-stretch` n'est pas retenue.
- À faire :
  - `src/components/harmonie/Catalogue.tsx:259` : `truncate` devient `line-clamp-2` sur `<span className="truncate font-medium">{f.nom}</span>`.
  - `src/components/harmonie/Catalogue.tsx:252` : le conteneur `md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0` (cartes, tablette portrait) devient `md:columns-2 md:gap-4` ; chaque carte `data-famille` (ligne 254) prend `md:break-inside-avoid` et `md:mb-4` (ou `md:mt-4` sauf la première) à la place du `gap`.
  - Vérifier que le mode « liste » (téléphone et deux volets, `cartes` faux) garde `space-y-5` et une seule colonne.
  - Aucune clé de langue.
- Critères : tablette portrait en 中文 (820 px) : « +1 ton par le 5 de la nouvelle tonalité » lisible sur deux lignes, plus de point de suspension tant que le titre tient sur deux lignes ; plus de trou blanc sous les petites familles (Modulations dans un chant, Intros, interludes et fins). Téléphone, tablette paysage, ordinateur : inchangés. Clair, sombre, français, 中文.
- Test : `tests/pages-en-grand-harmonie.spec.ts` : sur la disposition tablette portrait, aucune carte `[data-famille]` ne se coupe sur deux colonnes (`boundingBox` d'une carte tient dans une seule colonne) et aucun titre n'a `scrollWidth > clientWidth` ; sur les autres, la liste reste en une colonne.
- Points de vigilance de la planche : effet de bord assumé, l'ordre de lecture devient colonne par colonne ; le dessin « après » vient du code lu.

### musiciens-8 · Badge « à relire » répété et « Voir plus » qui a l'air désactivé
- Tranche : T1
- Décision : correction recommandée, ne plus afficher le badge quand toutes les fiches visibles sont à relire, et « Voir plus » devient « Voir les N autres » en `--foreground` avec chevron ; l'inversion « relue » n'est pas retenue.
- À faire :
  - `src/components/harmonie/Catalogue.tsx:261-265` : n'afficher le badge `harmonie.aRelire` que si au moins une fiche de la liste n'est pas « à relire » (`fiches.some((f) => f.statut === "validee")`) ; sinon le bandeau (`harmonie.aRelireTout`, ligne 278) suffit. Si le badge reste affiché, `text-[11px]` passe à 12 px (voir musiciens-9).
  - `src/components/harmonie/Catalogue.tsx:233-237` (parcours) : le bouton « Voir plus » devient `harmonie.voirLesAutres` avec `count: parcours.length - etapes.length` (7 aujourd'hui), classe `text-foreground` à la place de `text-muted-foreground` (ligne 235), suivi d'un `ChevronDown` de 16 px.
  - `src/components/harmonie/FicheHarmonie.tsx:240-246` (répertoire) : même traitement, `harmonie.voirLesAutresChants` avec `count: exemples.length - 6` (43 aujourd'hui), `text-foreground` à la ligne 244, chevron bas de 16 px.
  - Clés à créer dans `harmonie` : `voirLesAutres_one` « Voir l'autre » / `voirLesAutres_other` « Voir les {{count}} autres » ; zh-CN `voirLesAutres_other` « 查看其余 {{count}} 个 » ; `voirLesAutresChants_one` / `_other` idem en français, zh-CN « 查看其余 {{count}} 首 ». `harmonie.voirPlus` reste (utilisée ailleurs : `tests/harmonie-idees.spec.ts`, `harmonie-regroupees.spec.ts`) ; vérifier par grep avant de la retirer, sinon la laisser.
  - Tests à adapter : `tests/harmonie-catalogue.spec.ts:60` (`getByRole("button", { name: "Voir plus" })` devient `/Voir les 7 autres/`, ou le nombre calculé).
- Critères : sur un catalogue entièrement « à relire », aucune fiche ne porte de badge et le bandeau reste en tête ; le bouton lit « Voir les 7 autres » (« 查看其余 7 个 ») en encre, avec un chevron bas, clairement actionnable ; dans une fiche, « Voir les 43 autres » (« 查看其余 43 首 »). Quatre dispositions, clair, sombre, français, 中文 (le chevron ne se retourne pas en lecture de droite à gauche : sans objet ici).
- Test : `tests/harmonie-catalogue.spec.ts` (parcours, ligne 54-64) : le bouton est « Voir les 7 autres » puis les dix liens apparaissent ; aucun élément « à relire » dans la liste quand toutes les fiches le sont ; `tests/harmonie-idees.spec.ts` et `harmonie-regroupees.spec.ts` ne doivent pas bouger.
- Points de vigilance de la planche : la règle du badge tient parce que les 69 fiches sont toutes à relire ; dès qu'une fiche est validée, le badge réapparaît sur les fiches encore à relire (comportement voulu, à garder).

### musiciens-11 · Listes Tonalité et Capo à 36 px au toucher
- Tranche : T1
- Décision : correction recommandée, `h-11` au doigt et `h-9` à la souris, même règle que les pastilles ; le remplacement par le menu unique n'est pas fait ici mais en T3.
- À faire :
  - `src/components/harmonie/FicheHarmonie.tsx:137` (`id="ton-fiche"`) et `:182` (`id="capo-fiche"`) : `h-9` devient `h-11 [@media(pointer:fine)]:h-9` (44 px au toucher, 36 px à la souris).
  - Aucune clé de langue.
  - Pour T3 : ces deux `<select>` natifs sont à remplacer par le menu unique du chantier 3 (« plus de `<select>` natif visible ») ; le contrôle de taille de cette entrée est alors à reporter sur le nouveau menu (même hauteur 44 / 36 px).
- Critères : tablette et téléphone (pointeur grossier) : les deux listes mesurent 44 px de haut ; ordinateur (souris) : 36 px. La ligne « Tonalité » ne déborde pas à 390 px. Clair, sombre, français, 中文 (libellé « 调 » et « 变调夹 »).
- Test : `tests/harmonie-catalogue.spec.ts` (le test de tonalité, ligne 90-106, ouvre la liste) : ajouter `boundingBox().height` de `#ton-fiche` ≥ 44 sur téléphone et tablette ; ≈ 36 sur ordinateur.
- Points de vigilance de la planche : constat lu dans le code seulement, la fiche Harmonie n'a été ouverte ni au téléphone ni à la tablette. Les deux lignes passent peut-être à la ligne à 390 px (`flex-wrap` est déjà là) : le regarder.

### musiciens-12 · Diagramme d'accord trop petit dans sa carte
- Tranche : T1
- Décision : correction recommandée, grille agrandie dans la variante carte seulement (30 px entre cordes, cases de 36 px, points de 24 px) ; le SVG fluide plafonné à 220 px n'est pas retenu.
- À faire :
  - La planche se trompe de portée : `GrilleGuitare` n'a pas de notion de variante, `grand` est passé dans les trois variantes (feuille, bulle, carte) à `src/components/accords/PanneauAccord.tsx:177-178`. Il faut donc un second mode : ajouter une propriété `agrandi?: boolean` à `DiagrammeGuitare` (`src/components/harmonie/Diagrammes.tsx:26`) qui la transmet à `GrilleGuitare` (ligne 109).
  - `Diagrammes.tsx:126-131` : avec `agrandi`, `S = 30`, `F = 36`, `D = 24`, `largeur = x0 + S * (CORDES - 1) + 16` (soit 192 px avec `x0 = 26` ; la planche annonce 196, à ajuster à l'œil), `y0` et la marge basse proportionnelles ; mettre à jour le commentaire de la ligne 107 (grille de 24 / 30 / 20 px = 162 × 152 px).
  - `PanneauAccord.tsx:177` : passer `agrandi` seulement si `carte` (ligne 104).
  - Vérifier que `[&_svg]:max-w-full` (ligne 172) garde le diagramme dans sa carte à 390 px (la carte n'est visible que sur la page `/accords`).
  - Aucune clé de langue. Le bleu de l'accord et des diagrammes (`--chord-color`, zone gelée) ne change pas.
- Critères : page `/accords` en guitare, carte de l'accord : diagramme ≈ 1,2 fois plus grand (≈ 192-196 px de large), traits et points proportionnés, deux grilles alignées en haut quand il y a deux positions ; feuille du bas et bulle : inchangées (162 px). Tablette portrait, paysage, ordinateur et 1 440 px (la carte n'existe pas sur téléphone si la page `/accords` y est à une colonne : vérifier). Clair, sombre, 中文.
- Test : `tests/accords-page.spec.ts` (déjà en grand écran) : largeur du SVG de la carte ≥ 190 px ; dans la bulle (`tests/accords-toucher.spec.ts`), toujours 162 px.
- Points de vigilance de la planche : « environ 1,2 fois plus grand, à valider à l'œil » ; alternative (plafonner à 220 px) à reprendre si 196 px déborde.

### musiciens-2 · Les filtres prennent plus de place que la liste
- Tranche : T3
- Décision : B, « La sensation reste à l'écran, Moment et Niveau deviennent deux menus ». Elle se code avec le menu unique du chantier 3, pas avec un menu de plus. Dans la même entrée : retrait du doublon Théorie / RD-2000 au téléphone et « Par où commencer » replié sur deux volets (proposés et chiffrés par la planche, communs aux trois pistes, « Oui » aux deux questions du directeur artistique).
- À faire :
  - Filtres, `src/components/harmonie/Catalogue.tsx:176-205` : garder `OngletsRail` Piano | Guitare (ligne 179) puis deux pastilles-menus « Moment ▾ » (`harmonie.moment.titre`) et « Niveau ▾ » (`harmonie.niveau.titre`) sur la même rangée, à la place des deux `Pilules` des lignes 192-203 ; la `Pilules` des sensations (ligne 186-191, douze valeurs) reste en rangée sous la première, avec le fondu de musiciens-4. Les deux menus sont ceux du chantier 3 (un seul composant de menu déroulant, jamais un `<select>` natif visible). Un choix fait : la pastille affiche la valeur (« Refrain ▾ ») en `bg-foreground text-background` ; le menu garde une première option « Tous les moments » / « Tous les niveaux » qui retire le filtre. Menu : lignes de 44 px au doigt, 34 px à la souris, 8 lignes pour Moment (7 valeurs + « Tous »), 4 pour Niveau.
  - Valeurs longues (« Transition », « Intermédiaire »), décision : passer à la ligne (`flex-wrap`), soit une ligne de plus seulement quand les deux valeurs longues sont choisies à 380 px ; ne pas raccourcir les valeurs.
  - Doublon au téléphone : supprimer le bloc `md:hidden` de `Catalogue.tsx:150-175` (lignes Théorie et Sons du RD-2000), la barre d'onglets du bas les montre déjà (à confirmer sur un appareil avant de merger, la planche l'a vu sur capture). Supprimer ensuite ce qui devient orphelin dans ce fichier : `lecons` / `faits` / `chapitres` / `fini` (lignes 123-125), `useRd2000` (ligne 127, import ligne 27), `GraduationCap`, `Piano`, `GroupRow` si plus utilisé ; les clés `harmonie.cours.ligne`, `harmonie.cours.progres` (la planche propose de reporter l'indication « 23 chapitres » sur la page Théorie) et `harmonie.rd2000.resume` sont à garder si une autre vue les emploie (`harmonie.cours.chapitres` et `cours.sommaire` servent à `SommaireCours.tsx`, `LienHarmonie.tsx`) ; vérifier par grep avant de supprimer quoi que ce soit.
  - « Par où commencer » replié (`Catalogue.tsx:207-238`) : sur deux volets seulement, le parcours devient une seule ligne qui se déplie sur place : titre `harmonie.parcours`, sous-ligne « 10 fiches dans l'ordre », chevron qui pivote ; `toutLeParcours` (ligne 128) pilote déjà le dépliage de 3 à 10 étapes, on y ajoute un état « replié » initial propre aux deux volets. Au téléphone et en tablette portrait, le parcours garde son affichage actuel (trois étapes puis « Voir les N autres », voir musiciens-8).
  - Clés à créer dans `harmonie` : `moment.tous` « Tous les moments » / « 全部段落 » ; `niveau.tous` « Tous les niveaux » / « 全部难度 » ; `parcoursSous_one` « {{count}} fiche dans l'ordre » / `_other` « {{count}} fiches dans l'ordre » ; zh-CN `parcoursSous_other` « 按顺序的 {{count}} 张卡片 ». Le titre du parcours en 中文 reste « 从这里开始 ». Les noms de groupe `moment.titre` (« 段落 ») et `niveau.titre` (« 难度 ») existent déjà. Si besoin d'un nom accessible pour la pastille ouverte, réutiliser ces titres.
  - Repli si le menu unique du chantier 3 glisse (décision de la planche) : deux `<select>` natifs en forme de pastille, déjà employés pour Tonalité et Capo, à remplacer ensuite par le menu unique ; ce repli est à signaler à Timothée avant de s'en servir, car T3 vise « plus de `<select>` natif visible ».
  - Tests à adapter : `tests/harmonie-catalogue.spec.ts:66-78` (le test des filtres utilise `getByRole("group", { name: "Sensation" })` : la sensation reste un groupe de boutons, rien à changer ; ajouter Moment et Niveau comme menus), `tests/harmonie-cours.spec.ts:58` (le lien « Théorie musicale » du catalogue au téléphone disparaît : cliquer l'entrée « Théorie » de la barre d'onglets du bas, comme les autres projets), `tests/agencement-v18-moi.spec.ts:150` et `:212` (ces deux lignes portent sur l'aperçu « Harmonie » de la page Moi, pas sur le catalogue : à vérifier qu'elles ne bougent pas).
- Critères : gain mesuré par la planche, filtres −80 px à l'ordinateur et −78 px au téléphone, parcours replié −204 px à l'ordinateur, doublon −105 px au téléphone (total −284 px ordinateur, −183 px téléphone). À 1 280 × 720 et au téléphone, la première fiche de la liste est visible sans défiler (au téléphone, la première famille n'est plus masquée par la barre d'onglets). Tablette portrait et paysage : parcours conforme à la disposition (replié seulement sur deux volets). Les douze sensations restent à l'écran. Clair, sombre, français, 中文 (« 段落 ▾ », « 难度 ▾ »), 1 440 px compris.
- Test : `tests/pages-en-grand-harmonie.spec.ts` (déjà en grand écran) : sur les quatre dispositions plus 1 440 px, `boundingBox().y` de la première fiche de la liste < hauteur de l'écran moins la barre d'onglets ; aucun `<select>` natif visible dans `[data-harmonie]` ; choisir Moment = Refrain réduit la liste et la pastille lit « Refrain » ; « Tous les moments » rend la liste. Spec `tests/harmonie-catalogue.spec.ts` adaptée comme ci-dessus.
- Points de vigilance de la planche : revient sur la réponse 5 du 05/10 (des rangées qui défilent) ; B l'emporte parce que la sensation reste à l'écran, pas par le gain de place (A −120 px, B −80 px, C −80 px à l'ordinateur) ; Moment et Niveau coûtent un tap de plus. Le doublon Théorie / RD-2000 au téléphone est à confirmer sur un appareil (vu sur capture, jamais ouvert). Les menus, feuilles et mouvements ne figurent pas sur les captures statiques de la planche : les dessins sont les premiers.

### musiciens-9 · Textes de 10 à 12 px
- Tranche : T4
- Décision : correction recommandée, passer les légendes à `text-sm` (13 px), pas d'alternative. Un constat de plancher de taille de texte : il va dans la tranche typographie (plancher 12 px, 13 px sur grand écran).
- À faire :
  - `src/components/accords/PageAccords.tsx:87` (`accords.aideNotes`) et `:143` (`accords.dansLesChants`) : `text-xs leading-5` devient `text-sm leading-5` (ou `leading-[1.45]` si 20 px est trop serré à 13 px).
  - `src/components/accords/PanneauAccord.tsx:199` (légendes de doigté, dans `!carte`) : `text-xs` devient `text-sm`.
  - `src/components/harmonie/FicheHarmonie.tsx:200` et `:210` (légendes sous les diagrammes) : `text-[11px]` devient `text-sm`.
  - Si le badge « à relire » subsiste (`Catalogue.tsx:261`, `text-[11px]`, voir musiciens-8) : il monte à 12 px (`text-xs`).
  - À la livraison de T4, aligner ces valeurs sur l'échelle B retenue pour le chantier (13 px grand écran, plancher 12 px) plutôt que de les figer ici.
  - Aucune clé de langue.
- Critères : aucun texte de ce groupe sous 12 px ; la légende de la page Accords tient sur deux lignes dans 500 px à 13 px (`accords.aideNotes` et la ligne des doigts) ; aucun débordement horizontal. Quatre dispositions, 1 440 px, clair, sombre, français, 中文 (13 px en chinois reste lisible : aucune réduction à prévoir).
- Test : `tests/accords-page.spec.ts` (déjà en grand écran) : `fontSize` calculé de la légende ≥ 13 px et `scrollWidth <= clientWidth` ; une vérification générale des tailles est portée par le chantier T4.
- Points de vigilance de la planche : la valeur de `text-xs` n'est pas vérifiée ici (la planche parle de 11 px, Tailwind donne 12 px par défaut) ; lire la taille calculée avant de décider du palier.

### musiciens-10 · Contenu des fiches resté en français dans l'interface 中文
- Tranche : T5
- Décision : A puis B (« Assumer le français et le dire », recommandée tout de suite ; « Titres en deux langues, corps en français », recommandée ensuite). A est le bandeau « en français pour l'instant » du chantier contenu chinois ; B reste conditionnée à une relecture sinophone.
- À faire :
  - A (dans la tranche) :
    - Poser `lang="fr"` sur ce qui reste en français quand l'interface est en 中文 : le nom des fiches et des familles (`Catalogue.tsx:259`, titres de famille via `<Group title={nom}>` ligne 255), les étapes du parcours (`Catalogue.tsx:221-228`, `fiche.nom`), l'en-tête de la fiche (`FicheHarmonie.tsx` : le `Titre` autour de la ligne 106, `fiche.familleNom`) et le corps (`ParagrapheFiche`, `TexteFiche`) ; la bonne police latine et une lecture vocale correcte. Condition : seulement quand `i18n.language` est `zh-CN` (en français, `lang="fr"` est déjà la langue de la page).
    - Ajouter une ligne d'explication sous le sous-titre (`src/components/harmonie/EnTeteHarmonie.tsx:31` ou en tête de `Catalogue.tsx`), en 中文 seulement, en 14 px, `text-muted-foreground`.
    - Clé à créer dans `harmonie` : `contenuEnFrancais` ; zh-CN « 卡片内容目前只有法文，中文翻译会按类别陆续补上。 » ; fr « Le contenu des fiches est en français pour l'instant ; la traduction arrive famille par famille. » (la clé existe dans les deux langues ; l'affichage ne se fait qu'en 中文).
  - B (à planifier après la relecture ; hors code immédiat) :
    - Un champ `nom_zh` dans `docs/harmonie/*.md` (les 12 familles de l'index, 69 fiches), lu par `scripts/build-harmonie.ts` et publié dans `public/harmonie-index.json` ; le catalogue et la fiche affichent le titre chinois au-dessus et le titre français dessous en 13 px `text-muted-foreground`, comme le pinyin sous les titres de chants ; les sensations en pastilles pour ne pas se confondre avec le titre français gris. Familles proposées : 代替和弦 · 色彩和弦 · 低音线 · 经过和弦 · 小调借用 · 推进 · 前奏、间奏与结尾 · 歌曲内转调 · 两首歌之间的过渡 · 和弦排列 ; deux familles de l'index n'ont pas de traduction proposée (« Rythme harmonique », « Boucles pour la prière libre »).
    - Relancer `python3 scripts/build-fonts.py` après l'ajout du texte chinois (les sous-ensembles woff2) ; `npm run validate` signale un caractère manquant. Les titres chinois de la planche sont des propositions, à relire par un musicien sinophone de l'équipe (par exemple « 解决的挂四和弦 » pour « Le sus4 qui se résout », qui se lit aussi « le sus4 résolu »).
    - Les fiches passent à trois lignes (donc plus hautes) : à regarder avec musiciens-7 (`line-clamp-2`).
  - La traduction complète famille par famille (piste C de la planche, prévue par `docs/spec-harmonie.md:295`) reste planifiée ; le français reste en secours avec `lang="fr"`. Chantier de contenu, pas une tranche de code.
- Critères : A, en 中文 au téléphone et en tablette portrait, la ligne d'explication se lit sous le sous-titre, 14 px ; l'inspecteur montre `lang="fr"` sur les titres et le corps de fiche ; rien ne change en français. B, chaque fiche traduite porte son titre chinois au-dessus et le français dessous en 13 px ; une famille sans traduction garde le français seul avec `lang="fr"`. Quatre dispositions, 1 440 px, clair, sombre.
- Test : nouvelle vérification dans `tests/harmonie-catalogue.spec.ts` (ou une spec dédiée `tests/harmonie-zh.spec.ts`, à ajouter à `SPECS_GRAND_ECRAN` si elle mesure un agencement) : en langue 中文, la ligne d'explication est visible, `[data-famille] [lang="fr"]` existe ; en français, elle n'est pas dans la page. `npm run validate` pour B (caractères manquants).
- Points de vigilance de la planche : A ne change presque rien à l'œil (une ligne d'explication) ; le mélange du français et du chinois sur la même ligne reste tant que B n'est pas fait, et l'effet de `lang="fr"` ne se voit pas. Un musicien qui ne lit que le chinois ne peut toujours rien faire du catalogue avec A seule. B : 81 titres à traduire et à valider (69 fiches et 12 familles).
