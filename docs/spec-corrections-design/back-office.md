# Annexe · Corrections Back-Office

Source : planche `docs/planches/planche-corrections-back-office.html` (03/11/2026) ; décisions : recommandations (Timothée, 03/11/2026, « comme recommandé pour tout »). Audit d'origine : `docs/audit-design-2026-11-02.md`. Rien n'est codé ; chaque tranche attend son go (CLAUDE.md, « Go »).

Le groupe « Back-Office » (À faire, Tâches, Équipes) compte 13 constats : 11 sont retenus ici, 1 est gelé (`back-office-13`) et 1 est écarté à la revue (`back-office-14`), tous deux sans entrée (voir « Hors annexe »). Les tranches suivent l'ordre de livraison de `partout.md` : T1 corrections immédiates · T2 recette de surface · T3 contrôles de choix · T4 typographie et largeurs · T5 contenu chinois. Aucun constat du groupe ne relève de T4 ni de T5.

**Chemins corrigés par rapport à la planche** (vérifiés au code le 03/11/2026) : `BandeauEquipes.tsx` est dans `src/components/equipes/`, pas sous `backOffice/` ; la page d'une équipe est `src/app/equipes/[id]/PageEquipe.tsx` ; `MenuActions.tsx` est dans `src/components/layout/` ; la mise en colonne de `vues` est à `EquipesClient.tsx:147` et `:195` (la planche cite `:193`) ; `Retour` occupe `EnTetePage.tsx:22-31`.

## Récapitulatif

| id | titre | tranche | effort |
|---|---|---|---|
| back-office-1 | Téléphone en français : la cloche déborde à droite | T1 | Petit à moyen |
| back-office-4 | Équipes en bandeau : une colonne large coupée presque entière | T1 | Moyen |
| back-office-5 | Flèche ronde restée au bout de la première rangée de l'index | T1 | Petit |
| back-office-8 | Page Équipes (App) : aucun onglet de la barre n'est allumé | T1 | Petit |
| back-office-9 | « ‹ Équipes » et « Fait » / « Relier » sous 44 px | T1 | Petit |
| back-office-10 | Fiche d'équipe à 1 440 px : tâches à gauche, « Nouvelle tâche » à l'autre bout | T1 | Petit |
| back-office-11 | Titre « DA » nu alors que la liste dit « TEAM DA » | T1 | Petit |
| back-office-12 | Coupes disgracieuses au téléphone en français | T1 | Petit |
| back-office-6 | Trois recettes de carte dans le même espace | T2 | Moyen |
| back-office-3 | En sombre, « Fait », « Relier » et le segment actif sont noirs sur gris | T3 | Petit en code, moyen en regard |
| back-office-7 | « Église » et « Équipes » ont le même habillage au téléphone | T3 | Petit |

Entrées par tranche : T1 = 8 · T2 = 1 · T3 = 2 · T4 = 0 · T5 = 0 (11 au total).

## Points à confirmer avant le code

1. **`back-office-1` et `chants-1` (`partout.md`) touchent le même `lien` de `SelecteurEspace.tsx`.** `chants-1` resserre le segment de la barre latérale (`pleineLargeur`, `px-2`, 12 px) ; `back-office-1` change celui de la barre du haut sous 640 px (icône seule pour les espaces non choisis). Les deux se codent dans le même commit, la classe du segment étant écrite une fois avec ses variantes `max-sm:` (barre du haut) et `pleineLargeur` (barre latérale).
2. **`back-office-7` contredit une ligne de `partout.md`.** Le tableau « Où chaque contrôle s'applique » (Équipes) dit « Équipes · Musiciens reste en pilules (R4) ». La décision validée ici est A : un rail, donc une exception à R4 que Timothée a accordée en validant la recommandation. Lors de T3c, c'est `back-office-7` qui fait foi ; le commentaire d'en-tête de `src/components/layout/Onglets.tsx:8` (« Pilules : sous-onglets (Équipes · Musiciens) ») est à corriger dans le même commit. « Tout · Mes équipes » du Back-Office reste en pilules.
3. **`back-office-3` et T3 (rail)** : le curseur du rail de `partout.md` est écrit `--background` ; en sombre c'est `#000`, précisément le défaut de `back-office-3`. À lire `--pose` (voir l'entrée) dans le rail de T3a.
4. **`back-office-6` et T2a** : `AFaire.tsx:92` et `ColonneDroite.tsx:17` sont déjà listés dans les écrans pilotes de T2a (`partout.md`) ; `back-office-6` ajoute la fiche d'équipe (`PageEquipe.tsx`, T2b) et le point de vigilance du jeton distinct de `--secondary`.
5. **Mesures de `back-office-1`** : calculées depuis une capture à 393 px, sur la police des captures (Linux). À mesurer à 375 et 360 px, en français et en 中文, avant de coder (planche, « À décider »).
6. **Mouvement de la pastille (`back-office-1`)** : ni `Onglets.tsx` ni `SelecteurEspace.tsx` n'ont de pastille qui glisse, et le dépôt n'a pas de bibliothèque de mouvement (`package.json`). Voir l'entrée.

---

### back-office-1 · Téléphone en français : la cloche déborde à droite
- Tranche : T1
- Décision : C · icônes pour les espaces non choisis, libellé pour l'espace courant (avec le `gap-2` et le `px-2.5` de A). Pas de renommage de « Back-Office » (B écartée).
- À faire :
  - `src/components/layout/SelecteurEspace.tsx`, segment `lien` (l. 155-165, hors mode `compact`) : sous 640 px, un segment non courant n'affiche que son icône (celles du mode réduit, `icones`, l. 124 : `House`, `Music` (devient `Drum` avec `chants-7`), `ShieldCheck`, 18 px) dans un segment de 36 px de large (`max-sm:h-9 max-sm:w-9 max-sm:px-0`) ; le segment courant garde icône et libellé, `max-sm:px-2.5` (`px-3.5` au-delà). Le libellé des segments non courants prend `max-sm:hidden` ; icône `sm:hidden`. Le nom reste dans `aria-label` et `title` du lien (`backOffice.selecteur.app` / `.musiciens` / `.backOffice`, déjà en place : « App » / 应用, « Musiciens » / 乐手, « Back-Office » / 后台). Aucune clé de locale à créer ou changer.
  - Cible de toucher : `::after` de 44 px de haut par `after:-inset-y-1` (36 + 8), largeur du segment (`after:inset-x-0`) pour que les cibles de deux icônes voisines ne se recouvrent pas (la planche les montrait recouvertes de 8 px).
  - `src/components/layout/Navbar.tsx:131` : `gap-3` devient `gap-2` (8 px gagnés) ; à limiter à `max-sm:gap-2` si la barre de la tablette ou de l'ordinateur bouge à l'œil.
  - Mouvement : la pastille active glisse (amortissement critique, réponse 0,3 s ; avec `prefers-reduced-motion`, fondu de 150 ms). Rien n'existe dans le dépôt : pastille absolue mesurée au changement d'espace, `transform` et largeur en `transition` avec une courbe sans rebond ; si c'est disproportionné, garder le fondu actuel (`duration-150`) et le dire au rendu.
- Critères : à 393, 375 et 360 px en français, et à 360 px en 中文, le bord droit de la cloche reste à 16 px ou plus du bord (mesure `getBoundingClientRect`, chiffres de la planche : 3 px de marge à 360 px en français) ; zone de toucher de chaque segment 44 px de haut, sans recouvrement entre voisins ; segment courant lisible (icône + libellé), clair et sombre ; au-dessus de 640 px, tablette portrait comprise, rien ne change ; barre latérale inchangée par ce constat.
- Test : adapter `tests/back-office-espace.spec.ts` (projet `telephone`, viewports 393, 375 et 360 px en fr et zh-CN : aucun débordement horizontal de la barre, `aria-label` des segments, cibles ≥ 44 px de haut et non recouvrantes). Spec déjà dans `SPECS_GRAND_ECRAN` (`playwright.config.ts:81`).
- Vigilance : la marge à 360 px en français n'est que de 3 px, un libellé de plus la fait sauter ; mesures à refaire sur appareil ou en émulation avant de coder. Voir « Points à confirmer » 1, 5 et 6.

### back-office-4 · Équipes en bandeau : une colonne large coupée presque entière
- Tranche : T1
- Décision : B · le bandeau saute la demi-colonne (avec la garde au démarrage). Louange et EDD restent en dernier (réponse 11 de la planche).
- À faire : tout dans `src/components/equipes/BandeauEquipes.tsx`.
  - Largeurs, l. 235 : remplacer `lg:w-[calc((100cqw-64px)/2)] xl:w-[calc((100cqw-96px)/2)]` par une seule largeur `lg:w-[calc((100cqw_-_2*var(--marge-page)_-_16px)/2)]` (commune à toutes les pistes ; `--marge-page` vaut 40 ou 28 px, et non la marge fixe supposée). Téléphone et tablette portrait inchangés (colonne large déjà pleine largeur).
  - Arrêts : dans `fleche()` (l. 152-159) et `allerA()` (l. 142-145), les arrêts sont `departs = colonnesDOM().map(offsetLeft - marge)`. Retirer de cette liste tout arrêt où une colonne large (marquer les colonnes larges par un `data-large`) serait visible entre sa moitié et sa largeur entière moins la marge droite ; de la dernière petite colonne entière, le bandeau passe à l'arrêt suivant valable, ou au bout (`scrollWidth - clientWidth`). Les largeurs (Q12) ne changent pas.
  - Accroche tactile : `[@media(pointer:coarse)]:snap-x snap-mandatory` (l. 223) et `snap-start` des colonnes (l. 231) : les colonnes dont l'arrêt est retiré reçoivent `snap-align: none` (classe pilotée par l'état des arrêts mesurés).
  - Index : `amener(id)` (l. 147-150) sur une petite colonne dont le début a été retiré amène l'arrêt précédent où elle est entière ; `actif` et `lireVue()` (l. 103-111) inchangés.
  - Garde au démarrage : si une colonne large dépasse déjà de plus de la moitié au départ (peu de petites colonnes), elle prend la place restante sans descendre sous 340 px (capture 1 440 px : 500 px au lieu de 548). Défilement libre au pavé tactile inchangé.
  - Mouvement inchangé : `comportement()` (défilement doux, instantané avec `prefers-reduced-motion`).
- Critères : à chaque arrêt, Louange et EDD sont entières avant la marge droite ou n'en montrent que moins de la moitié (amorce). Ordinateur 1 440 px : départ avec Louange entière (≈ 500 px), arrêts à trois colonnes ou plus avant Louange, puis le bout ; ordinateur 1 280 px : l'arrêt « deux colonnes avant » est sauté (amorce 74 px), clic sur › enchaîne départ → bout ; tablette paysage après glissement : amorce 66 px ; 1 024 px barre dépliée : Louange à 340 px, plus collée à 8 px du bord gauche ; barre réduite, plus de filet de colonne à gauche (un filet de 24 px de la colonne précédente au bout est accepté). Fr et zh-CN, clair et sombre.
- Test : adapter `tests/equipes-agencement.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`, `playwright.config.ts:53`) : sur les cinq projets, parcourir le bandeau par › (pointeur fin) et par glissement (tablette) et, à chaque arrêt, mesurer la part visible de chaque colonne large (`getBoundingClientRect` contre le bord droit de la zone) ; interdire une part visible entre 50 % et 100 % hors du bout. Données de carte fictives : peu de petites colonnes (garde) et beaucoup.
- Vigilance : « un comportement invisible sur une maquette fixe », donc à regarder en séquence ; avec de vraies cartes de membres le nombre de petites colonnes change (le démarrage sera probablement propre partout, le défaut restant à l'arrêt « deux colonnes avant »). Effort Moyen, tests sur les cinq projets.

### back-office-5 · Flèche ronde restée au bout de la première rangée de l'index
- Tranche : T1
- Décision : recommandation du tableau des finitions : `items-end` et flèches habillées comme les pilules (l'alternative, retirer les flèches au pointeur fin, est écartée : elle contredit BO-G 6, `docs/spec-back-office-piste-a.md`).
- À faire : `src/components/equipes/BandeauEquipes.tsx` : l. 171, `<nav … className="flex items-start gap-2 sm:px-…">` devient `items-end` ; boutons ‹ › (l. 192-211, aujourd'hui `raised flex h-11 w-11 … rounded-full`) : `bg-secondary h-9 w-9` sans `raised` ni ombre, zone de toucher de 44 px par `relative after:absolute after:-inset-1 after:content-['']`. Le conteneur des flèches (l. 190, `gap-1.5`) passe à `gap-2` pour que les deux cibles de 44 px ne se recouvrent pas. Aucune clé de locale (`equipes.precedentes` / `equipes.suivantes` existent).
- Critères : quand l'index passe à la ligne (ordinateur, pointeur fin), ‹ › sont alignés sur le bas de la dernière rangée de pilules ; flèches de 36 px dessinées, zone de 44 px, même gris que les pilules (`--secondary`, `--secondary-fond` après T2) ; fr et zh-CN, clair et sombre ; ordinateur et 1 440 px, tablette paysage au pointeur fin.
- Test : `tests/equipes-agencement.spec.ts` (test « les flèches ‹ › hors des colonnes », l. 79) : ajouter que le bas de ‹ › est aligné sur le bas de la dernière rangée de l'index, et que le `::after` fait 44 px (`getComputedStyle(el, "::after")`).
- Vigilance : l'ombre de la flèche (`raised`) part ici ; si T2 est déjà livrée, le gris suit `--secondary-fond` sur fond de groupe.

### back-office-8 · Page Équipes (App) : aucun onglet de la barre n'est allumé
- Tranche : T1
- Décision : B · A (allumer Moi) plus un retour « ‹ Moi » sur l'index.
- À faire :
  - `src/lib/navigation.ts:41` : ajouter `"/equipes"` à `actifSur` de l'entrée Moi (couvre aussi `/equipes/<id>`) ; aucun préfixe en conflit (le Back-Office commence par `/back-office`).
  - `src/app/equipes/EquipesClient.tsx`, `enTeteApp` (l. 191-203) : `<EnTetePage retour={{ href: "/moi", label: t("moi.title") }} … />`, comme le Guide (`src/app/guide/page.tsx:178`). Libellés existants : « Moi » / 我 (`moi.title`) ; aucune clé à créer. Le retour ne se pose que dans l'App, pas dans la variante Back-Office (`entete`, l. 140).
  - Barre latérale et sélecteur de l'ordinateur : l'entrée Moi s'allume avec la même règle (une seule source, `actifSur`).
- Critères : sur `/equipes` et `/equipes/da`, l'onglet Moi est allumé dans la barre du bas (téléphone, tablette portrait) et dans la barre latérale (tablette paysage, ordinateur, 1 440 px) ; « ‹ Moi » / « ‹ 我 » est visible au-dessus du titre sur les cinq dispositions ; fr et zh-CN, clair et sombre.
- Test : `tests/look-navigation.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`) : `aria-current` sur Moi après `goto("/equipes")` ; `tests/equipes-page.spec.ts` : le lien « Moi » mène à `/moi`.
- Vigilance : une ligne de plus en tête d'une page déjà chargée de pilules (voir `back-office-7`, qui gagne une rangée au téléphone).

### back-office-9 · « ‹ Équipes » et « Fait » / « Relier » sous 44 px
- Tranche : T1
- Décision : A · zone de toucher élargie, dessin inchangé.
- À faire :
  - `src/components/layout/EnTetePage.tsx`, `Retour` (l. 22-31, `className` de la l. 27) : ajouter `relative after:absolute after:-inset-y-3 after:-inset-x-2 after:content-['']` (20 + 24 = 44 px de haut). Le composant sert une douzaine de pages : la correction vaut partout (téléphone et deux tablettes ; sans effet au pointeur fin).
  - `src/components/backOffice/aFaire/RangeeAFaire.tsx:39-40`, `Button asChild variant="outline"` : ajouter `relative after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-['']` (40 + 4 = 44 px) ; ce sont les verbes « Fait » / « Relier » (`min-h-10` et `sm:h-10`).
  - Aucune clé de locale.
- Critères : un toucher à 20 px au-dessus ou au-dessous du centre visible de « ‹ Équipes », « Fait » ou « Relier » active le lien ; aucun changement visible, les rangées ne grandissent pas ; téléphone, tablette portrait et paysage, fr et zh-CN. Zone de Retour : 6 px de recouvrement sur le titre `h1` (non cliquable), sans conflit.
- Test : nouvelle vérification dans `tests/equipes-page.spec.ts` (projet `telephone`, fiche d'équipe dans l'App) : `getComputedStyle(lien, "::after")` donne une hauteur ≥ 44 px, et `page.touchscreen.tap` 20 px au-dessus du lien suit le lien ; même vérification sur « Fait » dans `tests/a-faire.spec.ts` (ou une nouvelle spec de page, car l'actuelle teste la logique).
- Vigilance : une zone invisible ne se voit pas à l'œil, elle se vérifie au toucher, sur appareil. Selon la planche, le lien de 20 px passe sans doute le critère 2.5.8 de WCAG (exception d'espacement) : le défaut tient à la règle des 44 px du projet.

### back-office-10 · Fiche d'équipe à 1 440 px : tâches à gauche, « Nouvelle tâche » à l'autre bout
- Tranche : T1
- Décision : recommandation du tableau des finitions : deux colonnes comme À faire, `grid-cols-[minmax(0,1fr)_300px] gap-8` ; Tâches à gauche, Réunions et Membres à droite. L'alternative (plafonner le corps à 720 px) est écartée : elle reviendrait sur BO-G 2 (`docs/spec-back-office-piste-a.md`).
- À faire : `src/app/equipes/[id]/PageEquipe.tsx`, `CorpsEquipe` (l. 106-113) : quand la barre latérale est montrée (`useBarreMontree()` de `src/components/layout/BarreLaterale.tsx:76`, comme `AFaire.tsx:30`), remplacer le conteneur `space-y-8 px-[var(--marge-page)]` par `px-[var(--marge-page)] grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8` avec `SectionTachesEquipe` dans la colonne de gauche et `SectionReunions` + `SectionMembres` empilées (`space-y-8`) dans la colonne de droite ; sinon l'empilement actuel. Le bouton « Nouvelle tâche » (`BoutonSection`, l. 114, `taches.nouvelle`) reste dans le titre de la section Tâches : il se retrouve au bord droit de la colonne de gauche, plus près de son titre. Aucune clé de locale.
- Critères : à 1 440 px (barre latérale dépliée) et en tablette paysage / ordinateur où la barre est montrée : deux colonnes (la colonne de droite fait 300 px), « Nouvelle tâche » à moins de 300 px du titre « Tâches » ; téléphone et tablette portrait inchangés (une colonne). Fr et zh-CN, clair et sombre.
- Test : adapter `tests/equipes-page.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`, `playwright.config.ts:39`) : projet `ordinateur-1440`, `boundingBox` de Réunions à droite de Tâches, hauts alignés ; les autres projets en colonne unique.
- Vigilance : les données fictives n'ont pas de membres, donc la colonne de droite est courte ; la hauteur réelle avec des membres est inconnue. Les cartes de la page (`CARTE`, l. 40) changent encore avec `back-office-6` (T2b).

### back-office-11 · Titre « DA » nu alors que la liste dit « TEAM DA »
- Tranche : T1
- Décision : recommandation du tableau des finitions : titre court (« DA » / 美工组), sous-titre `equipes.soustitre.<id>` sur sa propre ligne, au-dessus du nombre de membres, sans point médian. L'alternative (« Team DA » en casse normale) dépend de la question des capitales et n'est pas retenue.
- À faire :
  - `src/app/equipes/[id]/PageEquipe.tsx`, `CorpsEquipe` (l. 96-104 pour le calcul de `sousTitre`, l. 112 pour l'`EnTetePage`) : composer le sous-titre en deux lignes `block truncate` : d'abord `t(\`equipes.soustitre.${id}\`)` quand il est non vide (douze équipes en ont un, sept ont `""`), puis le nombre de membres actuel (`equipes.page.sousTitre` / `sousTitreSeul`). Passer `sousTitrePlie` à `EnTetePage` (sinon son `truncate` ne laisse qu'une ligne).
  - `src/locales/fr.json:3355` : `"da": "Direction Artistique"` devient `"Direction artistique"` (deux majuscules à corriger ; la chaîne sert aussi à la carte du bandeau). `src/locales/zh-CN.json:3315` : `"da": "美术设计"` inchangé. Aucune nouvelle clé. Insertion en texte dans les deux fichiers, au même endroit. La même chaîne existe en dur dans `src/lib/equipes/table.ts:29` (`soustitre: "Direction Artistique"`) : à aligner (`"Direction artistique"`) si la description de la fiche (`role=dialog`, description accessible) doit rester cohérente.
- Critères : sur `/equipes/da` et `/back-office/equipes/da`, titre « DA » / 美工组, puis « Direction artistique » / 美术设计, puis « 4 personnes » / « 4 人 » (effectif fictif) ; une équipe sans sous-titre (traduction, théologie…) n'affiche que le nombre ; aucune coupe en 中文 ni au téléphone ; cinq dispositions, clair et sombre.
- Test : adapter `tests/equipes-page.spec.ts` (test de la page d'une équipe, l. 53) pour les deux lignes et l'ordre ; `tests/agencement-v18-t5.spec.ts:123` attend `toHaveAccessibleDescription("Direction Artistique")` : à mettre à jour avec `table.ts:29`.
- Vigilance : « École du Dimanche » (`edd`) porte la même double majuscule ; la planche ne le demande pas, laissé tel quel (à signaler à Timothée).

### back-office-12 · Coupes disgracieuses au téléphone en français
- Tranche : T1
- Décision : A · `text-balance` (et non `text-pretty`, correction de la planche : Safari gère `balance` depuis la 17.5, `pretty` seulement avec Safari 26, et le public est surtout sur iPhone). La réécriture du sous-titre (B) reste une option, non retenue.
- À faire :
  - `src/components/backOffice/aFaire/AFaire.tsx:72-73` : ajouter `text-balance` au titre `<b>` et au sous-titre `<span>` de la porte de la scène des fêtes.
  - `src/components/backOffice/aFaire/RangeeAFaire.tsx:31-32` : même classe sur le titre (`<b … line-clamp-2 …>`) et sur le contexte (`<span className="block …">`). Aucune clé de locale, aucun texte touché.
- Critères : au téléphone en français (412, 393, 375 et 360 px), aucun mot seul sur la dernière ligne pour « Noël » (porte) ni « compte » (rangée Relier) : rendu estimé « Réservations et ordre de / passage · Pâques, Noël » et « Noms du planning / sans compte » ; en 中文 et sur ordinateur, sans effet (chaque ligne tient déjà ; la porte est masquée sur ordinateur) ; `line-clamp-2` du titre toujours à deux lignes au plus.
- Test : nouvelle vérification (téléphone, fr) : `getComputedStyle(…).textWrap` vaut `balance` sur les quatre éléments, et la dernière ligne (mesurée par `Range.getClientRects()`) compte au moins deux mots ; dans `tests/back-office-espace.spec.ts` ou une nouvelle `tests/a-faire-coupes.spec.ts` (aucune des deux n'existe pour la page, `a-faire.spec.ts` teste la logique).
- Vigilance : non vérifiable sur WebKit (écarté de nos tests) ; vérifier sous Chromium que l'équilibrage marche avec `line-clamp-2`.

### back-office-6 · Trois recettes de carte dans le même espace
- Tranche : T2 (écran pilote en T2a, fiche d'équipe en T2b)
- Décision : B · la recette du chantier 2 (fond de groupe gris `#f2f2f7`, groupes blancs sans filet ni ombre, rayon 16). Le Back-Office est le premier essai du chantier 2 avec le même jeton.
- À faire : jetons de `partout.md` (« Recette de surface (C) » : `--fond-groupe`, `--secondary-fond`, `rounded-groupe`) ; ici seulement les usages du Back-Office.
  - `src/components/backOffice/aFaire/AFaire.tsx:92` : `rounded-2xl border border-border bg-card` devient le groupe `rounded-groupe bg-card` (sans bordure) ; même chose pour la porte de la scène des fêtes, l. 66.
  - `src/components/backOffice/aFaire/ColonneDroite.tsx:17` : `CARTE = "rounded-2xl bg-secondary px-4 py-3.5"` devient `rounded-groupe bg-card px-4 py-3.5` (la colonne de droite devient un groupe comme les autres).
  - `src/app/equipes/[id]/PageEquipe.tsx:40` : `CARTE = "raised rounded-2xl px-4 py-2"` devient `rounded-groupe bg-card px-4 py-2` (sans `raised`).
  - Fond de page `--fond-groupe` : posé une fois par `EnTetePage` (`src/components/layout/EnTetePage.tsx`) et `DeuxVolets` selon `partout.md` ; il couvre donc À faire, Tâches, Équipes et la fiche d'équipe du Back-Office. Le fond ne peut pas être `--secondary` : rails et pastilles d'index posés dessus s'effaceraient (rails, pistes et pastilles sur `--secondary-fond`, `#e5e5ea`).
  - Sombre : page `#000` et groupes `#1c1c1e` (`--card`), déjà en place. L'ombre reste réservée à ce qui flotte (`--shadow-flottant`).
  - Aucune clé de locale.
- Critères : sur ordinateur, 1 440 px et tablette paysage, la page est gris `#f2f2f7` en clair, « Cette semaine », « À lire ou à relier », « Ce dimanche », « Prochaine réunion » et les sections d'une fiche d'équipe sont des groupes blancs de même rayon (16), sans filet ni ombre ; téléphone et tablette portrait de même ; l'index des équipes, le rail et le segmenté restent visibles sur le gris (jamais `--secondary` sur `#f2f2f7`) ; en sombre aucune différence visible ; halo du haut de page jugé à l'œil sur le gris. Fr et zh-CN.
- Test : `tests/look-fondations.spec.ts` et `tests/look-secondaires.spec.ts` (cf. `partout.md`, « Fichiers à migrer ») : couleur de fond de page, fond et rayon des groupes, absence de `box-shadow` et de bordure sur les trois composants, sur les quatre dispositions plus 1 440 px.
- Vigilance : dépend de la question « fond de groupe gris en clair », tranchée par la recommandation de `partout.md` ; tant que T2 n'est pas faite, le Back-Office diffère de l'App. Le dégradé du haut de page se pose sur le gris (à juger à l'œil). Voir « Points à confirmer » 4.

### back-office-3 · En sombre, « Fait », « Relier » et le segment actif sont noirs sur gris
- Tranche : T3
- Décision : A · un jeton « posé » `--pose`, sur tout le site. La valeur se choisit à l'œil entre `#3a3a3c` (départ) et `#48484a`.
- À faire :
  - `src/app/globals.css` (bloc clair ~l. 189, bloc sombre ~l. 251) et `tailwind.config.ts` : nouveau jeton `--pose` = `0 0% 100%` en clair (rien ne change), `240 2% 23%` (`#3a3a3c`) en sombre ; couleur Tailwind `pose` au schéma `hsl(var(--pose))`.
  - Remplacer `bg-background` par `bg-pose` sur l'élément « posé » : `src/components/ui/button.tsx:18` (variante `outline`, utilisée par « Fait », « Relier », « Nouvelle tâche »… ; 34 fichiers contiennent `variant="outline"`), `src/components/layout/SelecteurEspace.tsx:133` (segment réduit) et `:160` (segment courant), `src/components/layout/Onglets.tsx:85` (curseur d'`OngletsRail`), `src/components/layout/MenuActions.tsx:70` (bouton « ⋯ ») et `src/app/equipes/EquipesClient.tsx:358` (bouton rond de la fiche).
  - Ombre du segment actif en sombre : `shadow-sm` devient un liseré clair en haut, `dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]`.
  - Aucune clé de locale.
- Critères : en sombre, « Fait », « Relier » et le segment actif du sélecteur d'espace (téléphone, barre latérale dépliée, barre réduite) et du segmenté Équipes | Musiciens sont gris moyen (`#3a3a3c`) sur rail `#2c2c2e` ou page noire ; le pas rail → pastille se voit ; en clair rien ne change ; ordinateur, tablette paysage et téléphone, fr et zh-CN. Avant de fixer la valeur, regarder une dizaine de pages à boutons à contour (planche : « la variante outline sert 60 fois dans 37 fichiers »).
- Test : `tests/look-fondations.spec.ts` (jetons clair et sombre : `--pose` vaut `#fff` en clair et la valeur retenue en sombre) et `tests/look-secondaires.spec.ts` (fond du segment actif et du bouton `outline` en sombre ≠ `#000`).
- Vigilance : « Nouvelle tâche » sur page noire devient une pilule gris moyen, comme tous les boutons à contour en sombre ; à regarder sur une dizaine de pages. Le pas jusqu'à `#3a3a3c` sur le rail `#2c2c2e` est faible : c'est le choix entre `#3a3a3c` et `#48484a` qui reste à l'œil. Voir « Points à confirmer » 3.

### back-office-7 · « Église » et « Équipes » ont le même habillage au téléphone
- Tranche : T3 (avec T3c, Équipes)
- Décision : A · « Équipes · Musiciens » en rail gris, avec `flex-wrap` (exception à R4, accordée par la recommandation).
- À faire :
  - `src/app/equipes/EquipesClient.tsx`, `vues` (l. 111-123) : remplacer `<Pilules … obligatoire>` par `<OngletsRail etiquette={t("equipes.vue")} onglets={[{ id: "equipes", label: onglets[0] }, { id: "musiciens", label: onglets[1] }]} actif={onglet} choisir={(v) => setOnglet(v as typeof onglet)} cible44 />` (`choisir` reçoit un `string`, d'où la conversion ; `OngletsRail`, `src/components/layout/Onglets.tsx:57` ; `cible44` déjà prévu, `Onglets.tsx:63`). Libellés existants `equipes.onglet.equipes` / `.musiciens` : « Équipes » | « Musiciens » ; 团队 | 乐手. Aucune clé à créer. Rail ≈ 38 px, pastille active `bg-background` (`bg-pose` après `back-office-3`) sur `bg-secondary`, 13 px semi-gras (`Onglets.tsx:80-86`).
  - Mise en colonne : `EquipesClient.tsx:147` et `:195`, `flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between` devient `flex flex-wrap items-center justify-between gap-2` : en tablette portrait, sélecteur ≈ 510 px + vue ≈ 190 px = 710 ≤ 762 px, tout sur une ligne (≈ 50 px gagnés) ; au téléphone la vue passe à la ligne.
  - Les pilules colorées des groupes et les petites pilules de l'index ne changent pas : hiérarchie groupe (pilules pleines) > vue (rail) > équipe (petites pilules). « Tout · Mes équipes » du Back-Office reste en pilules (filtre).
  - Mettre à jour le commentaire de `Onglets.tsx:8` (voir « Points à confirmer » 2).
- Critères : téléphone (fr et 中文, 412 px) : trois rangées (groupes, rail, index), rail à fond gris distinct des pilules encre ; tablette portrait 820 px : sélecteur et rail sur une même ligne ; ordinateur et 1 440 px : rail à droite du sélecteur ; cible de toucher 44 px ; clair et sombre.
- Test : adapter `tests/equipes-agencement.spec.ts` (cinq projets) : le groupe « Équipes · Musiciens » est un rail (pas `aria-pressed` de pilule), son `y` égal à celui du sélecteur en tablette portrait, plus bas au téléphone, hauteur de cible ≥ 44 px.
- Vigilance : exception à R4 (« Pilules » nomme ce sous-onglet) ; toujours trois rangées au téléphone (la carte remonte de 2 à 4 px seulement) ; si Timothée refuse l'exception, la solution de repli est C (Église active « au trait »). Voir « Points à confirmer » 2.

## Hors annexe

- **`back-office-13`** · « GCC Back-Office » répété à côté de l'onglet « Back-Office » : zone gelée (label contextuel animé de la barre du haut, `Navbar.tsx:144-150`, et son pendant dans la barre latérale). La recommandation de la planche (« GCC » seul quand le sélecteur est affiché) ne vaut que si le dégel du label est accordé ; il ne l'est pas, et la consigne exclut les zones gelées. Aucune entrée. Si Timothée accorde le dégel, ou choisit l'alternative (masquer le nom de marque sous `lg` pour un responsable, comme `max-sm:hidden`, `Navbar.tsx:144`), un lot séparé s'écrit.
- **`back-office-14`** · écarts verticaux inégaux sur Équipes en bandeau : écarté à la revue, aucune correction (les pas de 12, 26 et 20 px viennent du regroupement voulu de `EnTetePage` ; `gap-y-3.5` de l'index, `BandeauEquipes.tsx:174`, sert à ce que les cibles de 44 px se touchent sans se recouvrir).
