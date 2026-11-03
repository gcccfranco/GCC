# Annexe · Corrections quotidien

Source : planche `docs/planches/planche-corrections-quotidien.html` (03/11/2026) ; décisions : recommandations (Timothée, 03/11/2026, « comme recommandé pour tout »). Audit d'origine : `docs/audit-design-2026-11-02.md`. Rien n'est codé ; chaque tranche attend son go (CLAUDE.md, « Go »).

Groupe « quotidien » : Accueil / Planning, Mes services, Moi. 13 constats relevés, 11 retenus ; `quotidien-13` (verset plus clair que les cartes en sombre) et `quotidien-15` (titre du chapitre d'Harmonie en français sur la carte Moi en 中文) sont écartés à la revue et n'ont pas d'entrée. Aucun constat ne touche une zone gelée ni `--sec-chorus`. Déjà décidé, à ne pas défaire : « Je m'inscris » garde la couleur de service de la Table, le vert d'EDD reste en `svc-ink`, la tuile d'évènement garde sa couleur.

**Tranches.** T1 corrections immédiates · T2 recette de surface · T3 contrôles de choix · T4 typographie et largeurs · T5 contenu chinois. Les neuf constats propres à une page ou à un composant vont en T1 ; `quotidien-6` adopte la recette de surface unique (une carte en relief, des rangées) et suit donc T2 ; `quotidien-14` est le chantier « segmenté » du jeu B et suit T3. Les règles de largeur de `quotidien-3` et `quotidien-4` sont propres à Moi et à l'accueil (requête de conteneur à 720 px) : elles restent en T1 et ne dépendent pas de la règle L1 de T4.

## Récapitulatif

| id | titre | tranche | effort |
|---|---|---|---|
| quotidien-1 | Accueil en grand sans service à venir : colonne de droite vide | T1 | Petit |
| quotidien-3 | Moi : trous sous les cartes courtes, deux piles explicites | T1 | Petit à moyen |
| quotidien-4 | Phrases coupées à 1 280 px : requête de conteneur à 720 px et état vide réécrit | T1 | Petit |
| quotidien-5 | Mes services en grand : carte centrée sous un titre calé à gauche | T1 | Petit |
| quotidien-7 | Bannière « Active les rappels » : encadré gris, croix de 44 px | T1 | Petit |
| quotidien-8 | « Je m'inscris » : zone de toucher de 44 px | T1 | Petit |
| quotidien-10 | Onglets du Planning en tablette portrait : actif en noir, 44 px | T1 | Petit |
| quotidien-11 | Cartes de l'accueil : EDD sur deux étages, rangée alignée | T1 | Petit |
| quotidien-12 | Verset en romain dans les deux langues | T1 | Petit |
| quotidien-6 | Mes services en tablette portrait : une seule carte, rangées | T2 | Moyen |
| quotidien-14 | Segmentés en sombre : jeton `--segment-actif` | T3 | Petit |

Entrées par tranche : T1 = 9 · T2 = 1 · T3 = 1 · T4 = 0 · T5 = 0 (11 au total).

## Points à confirmer avant le code

- Six constats sont marqués « À confirmer » dans la planche (déduits du code, jamais vus sur une capture) : `quotidien-1` (le défaut ne touche que les membres sans service à venir), `-3`, `-4` (partie Moi), `-6`, `-8` (téléphone caché sous la barre du bas dans la capture) et `-11` (cartes Groupes et EDD remplies jamais capturées). Le testeur les mesure avant de coder : si la mesure ne montre pas le défaut, le dire, ne pas corriger.
- `quotidien-12` : la proposition de la planche ajoute le chinois en KaiTi, mais sa question Q3 tranche « romain dans les deux langues, boîte gardée ; KaiTi seulement si on veut un signe de plus ». L'annexe retient le romain seul ; KaiTi (et donc `python3 scripts/build-fonts.py`) est laissé de côté, à demander si Timothée le veut.
- Cas non réglé par la planche (`quotidien-4`, point de vigilance) : avec un bloc « Pour moi » à 1 280 px, la colonne de gauche de l'accueil reste sous 720 px de conteneur (environ 550 px), « Prochains évènements » y garde deux colonnes d'environ 255 px et « Parc de la Vill… » reste coupé pour un membre qui sert. À mesurer ; hors de cette annexe si rien n'est décidé.
- Règle « noir = sélection de navigation, filtre compris » (`quotidien-10`, `quotidien-14`) : à écrire dans la recette de contrôles (T3) pour que les deux entrées ne se contredisent pas.

## Tranche T1 · corrections immédiates

### quotidien-1 · Accueil en grand sans service à venir
- Tranche : T1
- Décision : A, la colonne s'efface (Q1 : oui) ; deux colonnes avec un service, une colonne large sans.
- À faire : dans `src/app/planning/page.tsx:219`, la grille `grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]` ne s'applique que si `pourMoiBloc` est vrai (`mesServices` est `null` sans service à venir, `pourMoi()` dans `src/lib/planning/accueil.ts:34`) ; sinon `ceDimanche` seul, sans grille. Aucune clé de locale. La requête de conteneur à 720 px de `src/components/accueil/CeDimanche.tsx:335` s'enclenche alors d'elle-même (Groupes, EDD et Table en trois colonnes 1,2 / 1 / 1, soit environ 346 / 288 / 288 px à 1 280) et « Prochains évènements » passe sur deux colonnes (`CeDimanche.tsx:302`). La planche cite `planning/page.tsx:219-224` : le repère est exact. Aucun nouveau composant.
- Critères : sans service, « Ce dimanche » va du bord gauche au bord droit du contenu (952 px à 1 280, 1 112 px à 1 440), sans colonne vide, trois cartes en rangée, « Parc de la Villette » entier ; avec un service, la page est inchangée (deux colonnes, verset sur toute la largeur). Ordinateur et 1 440 px, fr et 中文, clair et sombre ; tablette et téléphone inchangés.
- Test : adapter `tests/pages-en-grand-accueil.spec.ts` (test « sans service à venir, « Pour moi » disparaît ; « Ce dimanche » reste », ligne 178) : largeur de la section « Ce dimanche » égale à celle du contenu en grand ; ajouter la mesure avec service (deux colonnes). Spec déjà sur cinq projets (`pages-en-grand-.*`).
- Vigilance : la page n'a pas la même forme pour un membre qui sert et pour un qui ne sert pas (choix assumé, Q1) ; la carte Culte devient très large pour une ligne de texte. Les propositions B (état vide « Pour moi ») et C (évènements à droite) sont écartées.

### quotidien-3 · Moi : deux piles explicites
- Tranche : T1
- Décision : A, deux piles explicites, avec la règle de largeur de `quotidien-4` (une colonne sous 720 px de conteneur, deux piles au-dessus, compte collant en grand).
- À faire : dans `src/app/moi/page.tsx:132-140` (bloc `apercus`, le repère de la planche est exact), remplacer la grille `md:grid-cols-2` par deux piles `space-y-4`. Pile de gauche : `ApercuServices`, `MesPresidences`, puis `ApercuHarmonie` (quand `!harmonie.chargement && harmonie.peut`). Pile de droite : `ApercuTaches` (`BACK_OFFICE && equipes.length > 0 && user`), `CarteMesEquipes`, `CarteCeQueTuPeuxFaire` (`BACK_OFFICE`). Les deux piles sous `grid items-start gap-4` à deux colonnes seulement au-delà de 720 px de conteneur (voir `quotidien-4` pour l'enveloppe `container-type`). Back-office coupé : la pile de droite est vide, tout reste à gauche. Compte collant en grand : `sticky top-[calc(var(--nav-h)+20px)]` sur la colonne du compte (la colonne gauche de la mise en page, pas sur `apercus`). Pas de clé de locale. Chaque pile doit se rendre sans enfant vide (ne pas garder de pile fantôme qui ajoute un `gap`).
- Critères : plus de trou d'environ 75 px sous « Mes services » à côté de « Mes tâches » ; à 1 440 px et en tablette portrait (762 px utiles), deux piles ; à 1 280 px et en tablette paysage, une colonne de 592 px ; compte collant visible au défilement en grand. Mes services reste en haut à gauche. Fr et 中文, clair et sombre, membre sans back-office (tout à gauche).
- Test : adapter `tests/pages-en-grand-moi.spec.ts` (test « disposition (v18, A12) » ligne 69) : à 1 440 px, la pile de droite à droite de la pile de gauche et leurs hauts alignés ; à 1 280 px, une colonne. Ajouter l'assertion du compte collant. Le constat repose sur le code, la capture est exclue (adresse réelle) : utiliser un compte fictif.
- Vigilance : les deux piles finissent à des hauteurs différentes, seulement en bas ; si une carte manque, la règle de répartition ci-dessus s'applique. À 1 280 px, A donne la même colonne unique de 592 px que la proposition C ; les deux piles n'existent qu'à 1 440 px et en tablette portrait.

### quotidien-4 · Phrases coupées à 1 280 px
- Tranche : T1
- Décision : A, la requête de conteneur à 720 px (une seule règle de largeur dans le site), plus le texte de C (état vide en deux phrases, sans tiret cadratin).
- À faire : (1) Les aperçus de Moi passent à deux colonnes seulement au-delà de 720 px de conteneur, même règle que `CeDimanche.tsx` (`[@container(min-width:720px)]:`) : envelopper le bloc `apercus` de `src/app/moi/page.tsx:132` dans un `div` `[container-type:inline-size]`, la grille des deux piles à l'intérieur (voir `quotidien-3`). `src/components/moi/Apercus.tsx` garde ses `truncate` (lignes 34, 120, 171, 196, 206) : à 592 px la colonne les rend inutiles. (2) Accueil : réglé par `quotidien-1` (évènements en deux colonnes d'environ 460 px). (3) Textes : `src/locales/fr.json:841` `mesServices.emptyUpcoming` « Aucun service à venir — profite du repos » devient « Aucun service à venir. Profite du repos. » ; `src/locales/zh-CN.json:837` « 暂无即将到来的服事——好好休息 » devient « 暂无即将到来的服事。好好休息。 » (même mot que le titre 我的服事). La planche cite exactement ces fichiers et lignes.
- Critères : à 1 280 px (ordinateur, tablette paysage), Moi en une colonne de 592 px : plus de « … » sur « Prochain chapitre : 1. Le son, les notes … », « Les fiches de réharmoni… » ni « Aucun service à venir — profite du / repos » ; à 1 440 px et en tablette portrait, deux colonnes. Le texte d'état vide n'a plus de tiret cadratin en fr ni en 中文 (Mes services et l'aperçu de Moi, qui réutilise la clé : vérifier avec `grep -rn emptyUpcoming src`).
- Test : adapter `tests/pages-en-grand-moi.spec.ts` (aucune ligne `truncate` active : `scrollWidth <= clientWidth` sur les lignes d'aperçu à 1 280 px) ; chercher d'abord une assertion sur le texte ancien : `grep -rn "profite du repos" tests/`. Constat « Moi » déduit du code : mesurer avant.
- Vigilance : Moi est plus long à 1 280 px ; la coupure de l'état vide ne règle pas les colonnes trop étroites (c'est le rôle de la requête de conteneur). Cas non réglé : bloc « Pour moi » à 1 280 px (voir « Points à confirmer »).

### quotidien-5 · Mes services en grand : carte centrée sous un titre à gauche
- Tranche : T1
- Décision : recommandée : retirer `mx-auto`, garder la borne de 960 px.
- À faire : `src/components/layout/DeuxVolets.tsx:96` : retirer `mx-auto` de la classe de la « colonne seule » (`seule`), garder `w-full max-w-[calc(960px+2*var(--marge-page))] px-[var(--marge-page)] pb-6`. La carte part alors du bord du titre (x 288 à 1 440 px). Pas de clé de locale. Conséquence connue : à 1 440 px un vide d'environ 150 px à droite (contenu de 1 112 px, carte de 960 px).
- Critères : à 1 440 px (et à 1 280 px, où la borne de 960 px dépasse le contenu et ne change rien), le bord gauche de la carte est celui du titre « Mes services ». Clair et sombre. Aucun changement sur les autres pages à « colonne seule » à vérifier : `grep -rn "colonneSeule" src` (la règle s'applique à toutes) ; si une autre page change de bord, le dire.
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` (ou `tests/navigation-grand-ecran.spec.ts`, qui connaît `data-colonne-seule`) : `|x(carte) - x(titre)| < 2` sur `ordinateur-1440`.
- Vigilance : le vide de 150 px à droite à 1 440 px est assumé. Alternative écartée : mettre aussi le titre de page dans la colonne centrée de 960 px.

### quotidien-7 · Bannière « Active les rappels »
- Tranche : T1
- Décision : C, encadré d'information gris, maintenant, à revoir avec le chantier 2 (Q4).
- À faire : `src/components/push/PushPrompt.tsx:75-83` (repère exact de la planche). Conteneur : `rounded-xl border border-primary/30 bg-primary/5` devient `rounded-2xl bg-secondary` (sans filet, `px-4 py-3` conservé). Texte secondaire `text-xs` devient `text-[13px]`. Croix : bouton de `h-4 w-4` à zone de 44 px sans changer le dessin, `after:absolute after:-inset-3.5 after:content-['']` (l'icône de 16 px plus 14 px de chaque côté ; `-inset-3` ne ferait que 40 px). Bouton « Activer les notifications » (`PushPrompt.tsx` ligne ~97, `h-8`) : `h-11` sous pointeur grossier (`[@media(pointer:coarse)]:h-11`), `h-8` sinon. Titre inchangé (`text-sm font-semibold`). Pas de clé de locale (`push.promptTitle`, `push.promptText`, `push.iosInstall`, `accueil.notifs.activer` inchangées).
- Critères : plus de filet gris foncé en clair ni clair en sombre ; croix à 44 × 44 px de zone ; la bannière reste lisible dans les deux états (« Activer » et « installe d'abord » sur iPhone, plus long en 中文), dans la carte de Mes services (grand, clair et sombre) comme sur page nue. Téléphone, tablette, ordinateur, fr et 中文.
- Test : pas de spec dédiée (`grep -ln "PushPrompt\|Active les rappels" tests/` ne trouve rien) : ajouter à `tests/pages-en-grand-mes-services.spec.ts` une vérification de la zone de la croix (≥ 44 px) et de l'absence de bordure colorée ; capture des deux thèmes pour l'œil.
- Vigilance : dans la carte de Mes services en sombre, `bg-secondary` (`#2c2c2e`) est plus clair que la carte (`#1c1c1e`) : le défaut que `quotidien-13` retire pour le verset (écarté, le verset garde son aplat gris) ; accorder avec la recette de surface (T2). L'encadré gris est une surface de plus, moins visible qu'une bannière pour un appel à l'action qui compte. Alternatives écartées : carte comme les autres (A, carte dans carte en grand), rangée de la liste (B, impossible quand l'état est vide).

### quotidien-8 · « Je m'inscris » : cible de 44 px
- Tranche : T1
- Décision : A, zone de toucher élargie et invisible.
- À faire : `src/components/accueil/CeDimanche.tsx:283-290` (la planche cite la ligne 285, `className` du lien) : le bouton `h-8` reste à 32 px à l'œil ; ajouter à sa classe `after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-['']` (il porte déjà `relative`). Pas de clé de locale (`planning.accueil.inscrire`, « Je m'inscris » / 我来报名).
- Critères : la rangée « Petit déj » garde ses 40 px ; la zone cliquable du lien mesure au moins 44 px de haut (32 + 2 × 6) ; rien ne bouge à l'œil. Tablette et ordinateur d'abord ; le téléphone se vérifie par la mesure (le bouton est caché sous la barre du bas dans la capture d'origine : artefact de capture pleine page). Fr et 中文, clair et sombre. Seulement avec `BACK_OFFICE` ouvert et un petit déj libre.
- Test : adapter `tests/pages-en-grand-accueil.spec.ts` (lignes 235-236, le lien « Je m'inscris ») : zone du `::after` mesurée par `elementFromPoint` à 20 px sous le bord du bouton, ou `boundingBox` du lien plus hauteur du pseudo-élément via `getComputedStyle(el, "::after")`.
- Vigilance : la zone déborde de 2 px sur le filet voisin, sans conséquence. B (h-11 au toucher) et C (rangée entière cliquable) sont écartés.

### quotidien-10 · Onglets du Planning en tablette portrait
- Tranche : T1
- Décision : recommandée : onglet actif noir, 44 px.
- À faire : `src/components/layout/SectionTabs.tsx:158` (repère exact) : `min-h-10` devient `min-h-11` ; dans la branche `active`, `tab.color ? "texte-service" : "bg-secondary text-foreground"` devient `tab.color ? "texte-service" : "bg-foreground text-background"`, comme les pastilles de l'ordinateur (`src/components/layout/Onglets.tsx:186`). Les onglets de service gardent leur teinte `texte-service`. Pas de clé de locale (onglets Accueil, Culte Franco, Prépa. Table, Groupes, EDD / 首页…主日学).
- Critères : en tablette portrait (762 px utiles), l'onglet actif sans couleur de service (Accueil) est noir sur fond clair et clair sur fond sombre, 44 px de haut ; un onglet de service actif reste en teinte sur son fond gris. Fr et 中文, clair et sombre. Les trois dispositions utilisant `SectionTabs` sans régression de défilement horizontal.
- Test : adapter `tests/agencement-v18-planning.spec.ts` (ou `tests/look-planning.spec.ts`) : hauteur de l'onglet ≥ 44 px et couleur de fond de l'onglet actif sans service ≠ transparent, en `tablette`.
- Vigilance : `quotidien-14` écarte `bg-foreground` pour le segmenté parce qu'il se confondrait avec la pastille filtre noire ; ici le même noir marque l'onglet actif. La règle « noir = sélection de navigation, filtre compris » reste à écrire (voir « Points à confirmer »). Alternative écartée : utiliser sur tablette le composant de pastilles de l'ordinateur.

### quotidien-11 · Cartes de l'accueil : EDD sur deux étages
- Tranche : T1
- Décision : recommandée : chaque ligne d'EDD sur deux étages, comme Groupes ; la rangée Table / Évènements passe en `items-stretch`.
- À faire : (1) `src/components/accueil/CeDimanche.tsx:235-238` : chaque `<li data-testid="ligne-edd">` suit la grammaire de Groupes (lignes 205-218) : classe en gras (`b.svc-ink`, `font-semibold`) sur la première ligne, puis dessous `<p className="text-[13px] text-muted-foreground">` portant « Présidence … » (`{r("presidence")} <Noms … />`) ou « — » ; `items-start` sur le `li`, conserver `border-t border-border/70 py-2 text-sm` et le point/couleur d'EDD (`svc(PLANNING_COLORS.edd)`). (2) `CeDimanche.tsx:346` : `grid grid-cols-2 items-start gap-3.5` devient `grid grid-cols-2 items-stretch gap-3.5` (Table et Évènements s'alignent par le bas). La planche mentionne aussi « `items-start` sur Groupes / EDD » : c'est l'alternative écartée, la rangée Groupes / EDD (`CeDimanche.tsx:342`) reste en stretch par défaut. Pas de clé de locale.
- Critères : Groupes et EDD de même hauteur de rangée, sans vide sous EDD, avec « — » comme avec des noms ; les bas de la rangée Table / Évènements alignés ; le test `ligne-edd` continue de trouver trois lignes. Tablette (grille 2 colonnes) et ordinateur (≥ 720 px de conteneur, trois colonnes) ; téléphone en pile. Fr et 中文, clair et sombre.
- Test : adapter `tests/agencement-v18-planning.spec.ts` (`carteEdd`, ligne 343) : hauteur d'EDD = hauteur de Groupes à ±2 px, avec noms de présidence fictifs (constat déduit du code : les captures n'ont que « — »).
- Vigilance : mesurer avant (à confirmer). Alternative écartée : `items-start` sur Groupes / EDD (chaque carte à sa hauteur naturelle).

### quotidien-12 · Verset en romain dans les deux langues
- Tranche : T1
- Décision : romain, boîte gardée (Q3 ; `quotidien-13` écarté, le verset garde `bg-secondary`).
- À faire : `src/app/planning/page.tsx:233` : retirer `italic` de `<p className="text-sm text-muted-foreground italic leading-relaxed mb-3">`. Les guillemets « » et 「」 des clés `planning.verse.text` (`src/locales/fr.json:1449`, `src/locales/zh-CN.json:1417`) marquent déjà la citation ; aucune clé à changer. Pas de KaiTi (voir « Points à confirmer ») : donc pas de `scripts/build-fonts.py`.
- Critères : verset en romain en français comme en 中文, sans italique simulé sur le chinois ; la boîte `bg-secondary rounded-xl p-5` est inchangée. Les quatre dispositions, clair et sombre.
- Test : adapter `tests/pages-en-grand-accueil.spec.ts` : `getComputedStyle(verset).fontStyle === "normal"` en fr et en 中文 (sélecteur `blockquote` de l'accueil).
- Vigilance : le constat `quotidien-13` (contraste en sombre) est écarté ; ne pas retoucher la boîte.

## Tranche T2 · recette de surface

### quotidien-6 · Mes services en tablette portrait
- Tranche : T2
- Décision : B, une seule carte comme en grand (Q2 : oui).
- À faire : `src/components/mesServices/ListeMesServices.tsx:73` : retirer `disposition === "tablette" && "max-w-sm"` de la classe de `OngletsRail` (la bascule À venir / Passés prend toute la largeur, comme au téléphone et en grand). En tablette portrait, enrober le contenu dans la même « colonne seule » que le grand écran : une carte relief pleine largeur (762 px), classes `raised rounded-2xl`, aujourd'hui posée par `DeuxVolets` en grand et par la disposition `grand` de la ligne 66 (`px-4 pb-4 pt-4`) ; étendre le test `disposition === "grand"` de ce fichier (lignes 66 et 90) à la tablette. À l'intérieur : bascule pleine largeur, services en rangées (`group-row`, plus la grille de cartes en deux colonnes de la tablette), état vide en texte nu sans bordure en tirets (`src/components/layout/EtatVide.tsx`, `border border-dashed`) : supprimer la carte dans la carte, via une variante `nu` ou en rendant le `<p>` directement. Pas de clé de locale (`mesServices.tabUpcoming`, `tabPast`, `emptyUpcoming`, `emptyPast` inchangées ; `emptyUpcoming` est réécrite par `quotidien-4`). La planche place le travail dans « ListeMesServices.tsx, EtatVide » : le repère est correct.
- Critères : en tablette portrait, bascule de 762 px de large dans une carte, liste en rangées, état vide sans cadre en tirets ; quatre recettes ramenées à deux (liste en relief au téléphone, une carte au-delà). Fr et 中文 (即将到来 / 已过去, 暂无即将到来的服事。好好休息。), clair et sombre, état vide et avec deux services (fictifs). Téléphone, tablette paysage et ordinateur inchangés.
- Test : adapter `tests/pages-en-grand-mes-services.spec.ts` (déjà sur cinq projets) : en `tablette`, la bascule et les rangées dans une carte `raised` de la largeur du contenu ; état vide sans bordure en tirets. Constat déduit du code (seul l'état vide est capturé) : une capture avec deux services fictifs.
- Vigilance : abandonne la grille de cartes en deux colonnes de la tablette ; dépend de la recette de surface (une carte blanche sans ombre en T2, qui redéfinit `raised`) : coder après la tranche de surface, ou accorder les deux. Alternatives écartées : bascule pleine largeur sans carte (A, deux segments de 377 px pour deux mots), bascule à la largeur de son contenu (C, troisième façon de dimensionner un segmenté).

## Tranche T3 · contrôles de choix

### quotidien-14 · Segmentés en sombre
- Tranche : T3
- Décision : recommandée : jeton `--segment-actif`, `#ffffff` en clair, `#636366` en sombre, plus un filet `rgba(255,255,255,.1)` en sombre.
- À faire : définir `--segment-actif` dans `src/app/globals.css` (bloc `:root` près de `--secondary`, ligne 198, et bloc `.dark`, ligne 260) : `#ffffff` en clair, `#636366` en sombre ; ajouter `--segment-filet` (transparent en clair, `rgba(255,255,255,.1)` en sombre). Remplacer `bg-background text-foreground shadow-sm` des pastilles actives par `bg-[hsl(var(--segment-actif))]`-équivalent selon le format des jetons du fichier (suivre la forme de `--secondary`, en triplet HSL ou en hexadécimal) et le filet en sombre : `src/components/layout/Onglets.tsx:85`, `src/components/layout/SelecteurEspace.tsx:133` et `:160` (la planche cite exactement ces fichiers). Le glissement de la pastille reste en ressort sans rebond, en fondu sous `prefers-reduced-motion`. Pas de clé de locale. Note : la ligne 133 est l'espace en icône (barre réduite), la 160 le segmenté en texte.
- Critères : en clair, pastille `#ffffff` sur la piste grise ; en sombre, pastille `#636366` avec son filet, plus claire que la piste et distincte de la pastille filtre claire de `Onglets.tsx` (`bg-foreground`) ; l'entrée « Moi » de la barre latérale et la pastille « À venir » ne se contredisent plus (la planche la mesurait noire contre blanche). Quatre dispositions, fr et 中文.
- Test : adapter `tests/look-navigation.spec.ts` (déjà sur cinq projets) ou `tests/couleur-sombre.spec.ts` : couleur de fond de la pastille active en sombre `rgb(99, 99, 102)`, en clair `rgb(255, 255, 255)` ; contraste de la pastille sur la piste ≥ 1,3 : 1 (seuil de composant non textuel à vérifier avec Timothée) ; sans régression de `tests/navigation-grand-ecran.spec.ts`.
- Vigilance : le chantier T3 (jeu B, rail segmenté) touche les mêmes fichiers ; coder `--segment-actif` avec lui pour ne pas le refaire. Ne pas utiliser `bg-foreground text-background` pour le segmenté (alternative écartée : il se confondrait avec la pastille filtre noire).
