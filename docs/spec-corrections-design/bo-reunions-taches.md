# Annexe de spec · corrections du design · groupe Back-Office : réunions et tâches

Source : planche `docs/planches/planche-corrections-bo-reunions-taches.html` ; décisions : recommandations (Timothée, 03/11/2026)

Vingt constats, tous retenus (aucun écarté à la contre-vérification, aucun gelé : la planche ne touche ni `--primary`, ni `--sec-chorus`, ni le bleu des accords, ni le rouge du 简谱). Dix-huit relèvent de T1, deux de T3 (`bo-reunions-taches-2` et `bo-reunions-taches-12` posent la pastille filtre et le menu du jeu B). Aucune entrée en T2, T4 ni T5 :

| id | titre | tranche | effort |
|---|---|---|---|
| bo-reunions-taches-1 | Cartes de la fiche réunion contre le bord droit au téléphone | T1 | petit |
| bo-reunions-taches-2 | Rangée de filtres de l'agenda mal repliée | T3 (T3c) | moyen |
| bo-reunions-taches-3 | « Sujets à aborder » : l'aide à droite avec un trou à gauche | T1 | petit |
| bo-reunions-taches-4 | Champ du lien du compte rendu : pointillés, texte coupé | T1 | petit à moyen |
| bo-reunions-taches-5 | Deux grands titres sur les fiches en deux volets | T1 | moyen |
| bo-reunions-taches-6 | Le retour dit « Réunions » mais mène au Calendrier | T1 | petit |
| bo-reunions-taches-7 | Zone de texte « Description » d'une autre famille | T1 | petit |
| bo-reunions-taches-8 | Le formulaire de réunion parle d'« évènement » | T1 | moyen |
| bo-reunions-taches-9 | « Modifier » écrit deux fois | T1 | petit |
| bo-reunions-taches-10 | « À faire » écrit deux fois | T1 | petit à moyen |
| bo-reunions-taches-11 | Note et Historique de hauteurs différentes | T1 | petit à moyen |
| bo-reunions-taches-12 | Rangée d'équipes coupée au bord de la carte | T3 (T3c) | petit, une fois le menu livré |
| bo-reunions-taches-13 | Deux recettes de libellés dans le même Back-Office | T1 | moyen |
| bo-reunions-taches-14 | Feuille « Nouvelle tâche » : répétition en demi-largeur, bouton à gauche | T1 | petit |
| bo-reunions-taches-15 | « 10/28 » en 中文 | T1 | petit |
| bo-reunions-taches-16 | Bouton désactivé blanc sur gris | T1 | moyen (un fichier, mais regard sur 44 fichiers) |
| bo-reunions-taches-17 | Ordre des cartes de la fiche réunion | T1 | petit |
| bo-reunions-taches-18 | Agenda à 1 440 px : deux marges droites | T1 | petit (mesure d'abord) |
| bo-reunions-taches-19 | « Scène des fêtes » réduit à une icône au téléphone | T1 | petit |
| bo-reunions-taches-20 | « Annuler » en sombre : barre noire pleine | T1 | petit |

Entrées par tranche : T1 = 18 · T2 = 0 · T3 = 2 · T4 = 0 · T5 = 0 (20 au total).

## Chemins corrigés et points à confirmer avant le code

**Chemins.** Les numéros de ligne de la planche tiennent pour `SujetsAborder.tsx:35` et `:204`, `CompteRenduCarte.tsx:100`, `EnTeteReunion.tsx:60`, `FicheTache.tsx:240` (le rond : l. 239-245 en réalité), `FicheTache.tsx:289-296` (la section : l. 284-299), `TacheForm.tsx:17`, `EvenementForm.tsx:105`, `button.tsx:10`. Corrections et ajouts :
- Le retour « ‹ Réunions » (`bo-reunions-taches-6`) n'est pas seulement dans `EnTeteReunion.tsx:60` : il est aussi dans `src/app/back-office/evenements/[id]/modifier/ModifierClient.tsx:46` et `src/app/back-office/evenements/nouveau/NouveauClient.tsx:93` (`base` = `/back-office/reunions`, qui redirige). Ces deux fichiers servent aussi aux évènements ; seul le cas `reunion` change.
- La « bannière repliée dans Plus d'options » (`bo-reunions-taches-8`) n'est pas l'état d'aujourd'hui : dans `EvenementForm.tsx:244-265` la zone « Ajouter une bannière » est un bloc visible, hors du `<details>` (l. 315-364). Pour une réunion elle y est déplacée.
- Le « Note » de la tâche (planche `bo-reunions-taches-7`, piste B : « la Note d'une tâche garde sa boîte à filet ») est un `<Input>` d'une ligne dans `TacheForm.tsx:267`, pas une zone de texte. Les quatre fichiers qui importent `Textarea` sont `EvenementForm.tsx`, `PrevenirChangements.tsx`, `EditLineSheet.tsx` et `src/app/questionnaire/page.tsx` ; `grep "<textarea" src` trouve cinq écrits à la main (`PetitDejCase.tsx:118`, `ReportDialog.tsx:118`, `IdeesSheet.tsx:580`, `editeur/Volets.tsx:335`, `Notifier.tsx:319`), pas six : compter à nouveau avant de figer.
- Le panneau du jour (`bo-reunions-taches-18`) porte déjà `pr-[var(--marge-page)]` (`CalendrierClient.tsx:518`, retouche BO16 a). Voir l'entrée.
- La planche parle de pastilles « de 36 px » (`bo-reunions-taches-2`) ; le chiffre qui fait foi est celui de T3 (`partout.md`) : pilule 28 px au pointeur fin, 32 px au toucher, zone de 44 px.
- Fichiers réels : `src/components/reunions/` (`SujetsAborder.tsx`, `CompteRenduCarte.tsx`, `EnTeteReunion.tsx`), `src/components/taches/` (`FicheTache.tsx`, `TacheForm.tsx`), `src/components/evenements/EvenementForm.tsx`, `src/app/back-office/calendrier/CalendrierClient.tsx`, `src/app/back-office/reunions/layout.tsx`, `src/app/back-office/taches/[equipe]/layout.tsx`, `src/app/evenements/[id]/EvenementClient.tsx` (la fiche réunion du Back-Office, l. 216-231) et `src/app/back-office/evenements/gestion.module.css:15-25` (la grille de la fiche).

**Rappels valables pour toutes les entrées.**
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte au même endroit dans les deux fichiers, jamais par `json.dump`. Une clé devenue orpheline par la modification est retirée.
- Noms fictifs dans les tests, inventés pour chaque nouveau test (« Alix D. » et « Noa M. » sont des noms de dessin de la planche, ne pas les recopier) ; aucun vrai nom du planning.
- Surfaces et tailles : garder les classes d'aujourd'hui (`raised`, `text-[13px]`…). T2 migre les surfaces, T4 les tailles. Les mesures de la planche en 13 px sont déjà des valeurs du site.
- Dispositions à regarder à l'œil pour chaque entrée visuelle : téléphone, tablette portrait, tablette paysage (barre réduite), ordinateur, plus 1 440 px pour une page de lecture ; fr et zh-CN, clair et sombre. Une spec qui teste l'agencement s'ajoute à `SPECS_GRAND_ECRAN` (`playwright.config.ts`) : `agencement-v18-*.spec.ts`, `calendrier.spec.ts` et `retouches-v18-*.spec.ts` y sont déjà ; `reunions.spec.ts`, `reunions-back-office.spec.ts`, `equipes-reunions.spec.ts`, `taches-evenements.spec.ts` n'y sont pas (trois appareils).
- Mouvement (règle du groupe) : tout ce qui s'ouvre ou change d'état suit un ressort critique (amortissement 1,0, réponse 0,3 s), `prefers-reduced-motion` : fondu de 150 ms ; rien ne s'anime seul.

**Points à confirmer.**
1. **`bo-reunions-taches-12` B contre `partout.md` (« Formulaires »).** `partout.md` garde le `<select>` natif dans les formulaires (habillé : 44 px, rayon 12, chevron 16 px) et pose le `Menu` pour les filtres. La planche, elle, remplace les pastilles d'équipe de l'ordinateur ET le menu natif du téléphone par un menu unique. Lu ici : déclencheur en forme de champ (44 px, `bg-secondary`), panneau = primitive `Menu`. Si Timothée préfère le `<select>` habillé, rien à faire de plus que T3a sur ce champ.
2. **Portée de `bo-reunions-taches-10`.** La carte d'état est le même composant (`Fiche`) dans l'App (`/taches`) et au Back-Office. La planche ne montre que le Back-Office. Par défaut, ce qui suit s'applique au Back-Office (`backOffice`) ; l'App garderait l'ancien dessin, donc deux dessins pour une carte. À trancher : étendre à l'App.
3. **`bo-reunions-taches-8` : la catégorie « fixée ».** La planche masque « Catégorie » et la dit « fixée » sans dire à quelle valeur. Lu ici : le champ disparaît et la valeur déjà stockée reste (nouvelle réunion : celle d'`EMPTY_EVENEMENT`, « loisir », comme aujourd'hui ; règle info → église inchangée, `EvenementForm.tsx:29-31, 80`). Aucune donnée ne change. À confirmer.
4. **`bo-reunions-taches-5` : volets `nouvelle` et `modifier`.** La planche ne parle que de la fiche. Les pages « Nouvelle réunion » et « Modifier » ont aussi leur propre `EnTetePage` dans le volet de droite ; si la bande du haut perd son titre pour la fiche, elle le perd aussi pour elles, sinon « Réunions » réapparaît à leur ouverture.
5. **`bo-reunions-taches-11` : plafond de cinq lignes et « Tout voir ».** L'historique d'aujourd'hui compte au plus deux lignes (état de la fois, création : `FicheTache.tsx:176-179`). Le dessin de la planche en montre une troisième (« Échéance déplacée… ») qui n'existe pas dans les données. Ne coder ni plafond ni lien tant qu'une troisième source n'existe pas (CLAUDE.md : rien de spéculatif). À confirmer.
6. **`bo-reunions-taches-2` et `chants-6` (T3).** Les deux touchent `Pilules` (`Onglets.tsx:154`) : `chants-6` y branche `useFonduLateral`. À coder dans la même sous-tranche T3, `chants-6` d'abord ; l'entrée ci-dessous suppose le fondu déjà en place.
7. **Champ de date en « mm/dd/yyyy » sur les captures** (planche, « Vu en passant ») : langue du navigateur de test, non vérifiable sur capture. Pas d'entrée ; à regarder lors de la recapture (`locale` des projets Playwright).

---

### bo-reunions-taches-1 · Cartes de la fiche réunion contre le bord droit au téléphone
- Tranche : T1
- Décision : A · réparer la cause seule (sélecteur d'espace en icônes, `back-office-1` C) ; le test Playwright de C vérifie qu'il ne reste aucun débordement. B (garde-fou `min-w-0` / `w-full`) ne se code que si le test rougit encore après A.
- À faire :
  - Rien dans la fiche. Livrer `back-office-1` (annexe `back-office.md`, `SelecteurEspace.tsx`, `Navbar.tsx:131`) avant ou avec ce constat ; recapturer ensuite la fiche réunion à 393 px (fr, clair et sombre).
  - Nouveau test de non-débordement (voir Test). Pas de clé de locale.
- Critères : à 393, 375 et 360 px, en français, sur À faire, Calendrier, fiche réunion, fiche tâche et « Nouvelle tâche » : `document.documentElement.scrollWidth === clientWidth` ; cloche entière (bord droit à 16 px ou plus du bord) ; chacune des trois cartes de la fiche (Compte rendu, Sujets, Tâches) a 16 px de marge de chaque côté. Clair et sombre ; en 中文 rien ne change (déjà bon sur capture).
- Test : nouveau `tests/debordement-back-office.spec.ts`, ajouté à `SPECS_GRAND_ECRAN` : pour chaque page ci-dessus, `signInAs` (`tests/helpers/fakeSession.ts`) sur une fiche simulée, viewport 360 puis 393 px (projet téléphone seulement pour les deux largeurs), assertion `scrollWidth <= clientWidth` et marge droite de la cloche ≥ 16. S'il rougit une fois `back-office-1` livrée, coder B.
- Vigilance : la cause du débordement n'est pas établie sur capture (« À confirmer » dans la planche) ; les largeurs 360 et 375 px de la planche sont calculées depuis 393 px.

### bo-reunions-taches-2 · Rangée de filtres de l'agenda mal repliée
- Tranche : T3 (T3c : l'agenda est un cas de la pastille filtre et de son indice de défilement, et « Seulement moi » doit rester un filtre parmi les autres)
- Décision : A · deux rangées fixes, les filtres défilent. Rangée 1 : mois et « Aujourd'hui » ; rangée 2 : les cinq pastilles puis « Seulement moi » après un filet. B (menu de sources) et C (repli aligné) écartées.
- À faire :
  - `src/app/back-office/calendrier/CalendrierClient.tsx:327-366` : le bloc `filtres` (l. 329-345) retire son habillage `[&>div]:flex-wrap [&>div]:overflow-x-visible …` : `Pilules` redéfile de lui-même, avec le fondu de 24 px posé par `chants-6` (`useFonduLateral`, classe `fondu-lateral`, `globals.css:30`), visible seulement quand il reste des pastilles à droite.
  - `rangee` (l. 350-370) : une seule structure aux quatre dispositions. Rangée 1 : `navigation` (l. 275-291) ; rangée 2 : `filtres`, filet vertical (`<span aria-hidden className="mx-2 h-6 w-px shrink-0 bg-border" />`, existant l. 361), `seulementMoi` (l. 309), puis `boutonSources` (l. 321, pas dans la planche : il suit « Seulement moi », seulement en filtre « Tout »). Sur tablette et ordinateur tout tient sur la rangée 2 ; la rangée 3 du téléphone (l. 354-357) disparaît.
  - Taille des pastilles : celle de `Pilules` après T3 (28 px au pointeur fin, 32 px au toucher, zone de 44 px) ; la constante `PASTILLE_TEL = "!h-10 !px-3.5 !text-[15px]"` (l. 111) et son usage (l. 314) disparaissent avec la rangée 3 : « Seulement moi » et « Sources » prennent la même taille que les pastilles voisines (`PASTILLE`, l. 108, ramenée à la hauteur de `Pilules`).
  - Bandeau « Les évènements de 2026 restent dans le Sheet… » : `<AnnonceBascule className="mb-3" />` (l. 442, composant `src/components/evenements/AnnonceBascule.tsx:12-24`) descend en pied de liste, sous le contenu de l'agenda, en 13 px, sans aplat (`bg-secondary/60` retiré), même clé `backOffice.annonceBascule.avant`.
  - Aucune clé de locale.
- Critères : à 393 px (fr), une rangée de mois puis une rangée de pastilles qui défile, « Scène » et « Seulement moi » atteints en faisant défiler ; plus de pastille orpheline, plus de bandeau de deux lignes avant le premier contenu (le premier contenu remonte d'environ 120 px CSS) ; à 820 px (tablette portrait), à tablette paysage, à 1 440 px, toutes les pastilles sur la rangée 2 ; en 中文 inchangé ; le fondu n'apparaît que du côté où il reste des pastilles ; zone de toucher 44 px.
- Test : adapter `tests/agencement-v18-calendrier.spec.ts` et `tests/retouches-v18-agenda.spec.ts` (ils parlent de « Seulement moi » et du `data-testid="filtres-calendrier"`) et `tests/calendrier.spec.ts` (BO-C, l. 1546+ : filtres, bandeau « Sheet ») : nombre de rangées de filtres (une seule rangée de pastilles à 393 px), `scrollWidth > clientWidth` de la rangée de pastilles à 393 px, présence du fondu, bandeau après la liste (position `y` du bandeau supérieure à celle de la dernière entrée), mesures sur les quatre dispositions plus 1 440 px.
- Vigilance : au téléphone « Scène » et « Seulement moi » sortent de l'écran et se découvrent en défilant (le fondu est l'indice) ; dépend de `chants-6` (fondu sur `Pilules`) ; `Pilules` est partagé, tout autre usage est à contrôler (planning compris).

### bo-reunions-taches-3 · « Sujets à aborder » : l'aide à droite avec un trou à gauche
- Tranche : T1
- Décision : B · les deux aides réunies en pied de carte, un seul paragraphe de 13 px (A, aide sous le titre, reste le repli ; C, requête de conteneur, écartée).
- À faire :
  - `src/components/reunions/SujetsAborder.tsx:199-207` : la ligne de titre ne garde que le `<h3>` (l. 201) et le compteur (l. 202). Le `<span>` d'aide (l. 204-206) disparaît pour l'état « avant le début » ; il reste, à droite, pour l'état « commencée » (le bilan « n traités sur total », `evenements.sujets.traites`, classe `ml-auto` comme aujourd'hui, sans `w-full sm:ml-auto sm:w-auto`).
  - Pied de carte (l. 238, `{!commencee && <p … noteAvant>}`) : un seul `<p className="text-[13px] text-muted-foreground">` qui lit `evenements.sujets.aide` puis `evenements.sujets.noteAvant`, séparés d'une espace.
  - `src/locales/fr.json` et `zh-CN.json`, `evenements.sujets.aide` : ajouter le point final (fr « Chaque personne de la réunion peut en ajouter jusqu'au début. » ; zh-CN « 参会的每个人在会议开始前都可以添加。 »). `noteAvant` inchangée (zh : « 未讨论的议题会以红色显示；创建下一次会议时，会询问你是否沿用。 »). Aucune clé nouvelle.
- Critères : à toutes les dispositions, plus aucun texte gris collé à droite dans la ligne de titre ; le titre « Sujets à aborder » et son compteur sont seuls sur la ligne ; le paragraphe unique est sous la liste et lisible à 13 px ; une fois la réunion commencée, le bilan reste à droite et le paragraphe n'apparaît pas ; fr et zh-CN, clair et sombre.
- Test : adapter `tests/reunions.spec.ts` (l. 185 vérifie déjà le texte de l'aide dans la carte : il passe avec le point final ; ajouter que l'aide et la note du bas sont dans le même élément et que le titre ne contient plus d'aide) et `tests/reunions-back-office.spec.ts` pour la fiche du Back-Office.
- Vigilance : la règle « jusqu'au début » se lit après la liste, pas avant le champ (contre de la planche) ; le champ « Ajouter un sujet… » dit déjà ce qu'on peut faire.

### bo-reunions-taches-4 · Champ du lien du compte rendu : pointillés, texte coupé
- Tranche : T1
- Décision : A · un seul « champ à action » pour le lien et pour le sujet : aplat gris, sans bordure, 44 px, bouton d'action de 36 px à l'intérieur, à droite.
- À faire :
  - `src/components/reunions/CompteRenduCarte.tsx:99-110` : le `<label>` du champ (l. 100) passe de `border-[1.5px] border-dashed border-muted-foreground/40 bg-background … rounded-full` à `bg-secondary`, sans bordure, `h-11 rounded-full`, icône `FileText` à gauche (existante), anneau `focus-within:ring-2 focus-within:ring-ring` (sans `focus-within:border-*`). Le `<Button type="submit">` (l. 107-109, hors du champ, avec l'icône `Check`) entre dans le champ, à droite : `size="sm" className="h-9"`, libellé court, plus d'icône.
  - `src/components/reunions/SujetsAborder.tsx:210-217` : le formulaire d'ajout prend la même recette (`bg-secondary`, sans `border-[1.5px] border-foreground`, 44 px, `rounded-full`, icône `Plus`, bouton « Ajouter » de 36 px dedans). Mettre la recette en commun (une constante de classes dans un des deux fichiers, ou un petit composant `ChampAction` partagé par les deux) : les deux champs sont voisins dans la même fiche.
  - Locales : `evenements.compteRendu.enregistrer` « Enregistrer le lien » devient « Enregistrer » / « 保存 » (zh-CN : « 保存链接 » aujourd'hui) ; `evenements.compteRendu.placeholder` (« https://docs.google.com/document/… ») devient « Lien du Google Doc » / « Google 文档链接 » ; `evenements.compteRendu.lien` (aria-label) inchangée.
  - Bouton désactivé dans le champ (champ vide) : voir `bo-reunions-taches-16`.
- Critères : la fiche réunion n'a plus qu'une recette de champ ; le pointillé a disparu ; le texte saisi ne se coupe plus sans repère (le placeholder est court) ; en sombre le champ (`#2c2c2e` sur la carte `#1c1c1e`) se distingue de la carte ; une rangée de moins (44 px) sous le titre de la carte ; anneau de 2 px au focus ; téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px ; fr et zh-CN ; clair et sombre.
- Test : adapter `tests/reunions.spec.ts` : l. 650 (`expect(fr.enregistrer).toBe("Enregistrer le lien")`), l. 751, 756 et 787 (`getByRole("button", { name: "Enregistrer le lien" })`) deviennent « Enregistrer » ; ajouter qu'il n'y a plus de bordure en pointillés (`getComputedStyle(champ).borderStyle !== "dashed"`) et que le bouton est dans la boîte du champ (`boundingBox`).
- Vigilance : le champ des sujets perd son contour noir qui le désignait comme saisie principale (contre de la planche). Le bouton désactivé, gris sur gris, ne doit pas disparaître : voir l'entrée 16.

### bo-reunions-taches-5 · Deux grands titres sur les fiches en deux volets
- Tranche : T1
- Décision : A · l'objet est le seul grand titre : en deux volets la bande du haut ne garde que le retour et l'action de création ; le titre de la fiche passe en `h1` de 28 px.
- À faire :
  - Fiche réunion, deux volets : `src/app/back-office/reunions/layout.tsx:24-31` (`enTete`, `EnTetePage` avec « Réunions » et `sousTitreReunions`) : tant qu'une fiche, « nouvelle » ou « modifier » est ouverte (chemin autre que `/back-office/reunions`, déjà testé l. 21-22), la bande ne montre que `retour` (« ‹ Calendrier », `backOffice.entrees.calendrier`, déjà en place) et `action` (`BoutonNouveau`, « Nouvelle réunion ») ; ni titre ni sous-titre. `EnTetePage` exige un titre (`src/components/layout/EnTetePage.tsx:46`) : le rendre facultatif (rien n'est posé sans lui) ou bâtir la bande à la main avec `Retour` (même fichier, l. 23) ; dans les deux cas, la page garde un seul `h1`, celui de la fiche.
  - `src/components/reunions/EnTeteReunion.tsx:73-83` (branche deux volets, `<header>`) : le `<h2 … text-2xl …>` (l. 78) devient `<h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-foreground text-balance">` ; le badge d'équipe (l. 36-40, 77) reste, il porte « Réunion d'équipe · DA » ; le titre s'aligne en haut avec l'en-tête « À venir » de la liste (retirer la marge haute `mt-1.5` si besoin).
  - Fiche tâche, deux volets : `src/app/back-office/taches/[equipe]/layout.tsx:26-31` : le retour devient « ‹ Tâches de DA » (`href` de l'équipe, inchangé) et le `titre` (`backOffice.entrees.taches`) est retiré tant que la fiche est ouverte (`nouvelle` garde son en-tête actuel). Clé nouvelle `taches.retourEquipe` : « Tâches de {{equipe}} » / « {{equipe}} 的任务 », avec `equipe` = `t(cleNomEquipe(brut, true))`.
  - `src/components/taches/FicheTache.tsx:222-232` (`<header>` deux volets) : retirer `badgeEquipe` (l. 202-204, 224) ; le `<h2 id={titreId} … text-2xl …>` (l. 226) devient `h1` de 28 px, même classe que ci-dessus. Gain : environ 70 px en haut.
  - Fiche tâche, un volet (téléphone) : `FicheTache.tsx:215-220` : `retour` passe de `{ href, label: t("taches.title") }` à la même clé `taches.retourEquipe`, de façon que le retour soit identique aux quatre dispositions ; le `sousTitre={nomEquipe}` (l. 218) devient redondant et part (voir point à confirmer 4 pour la portée).
  - Fiche réunion à un volet : `EnTeteReunion.tsx:56-71` inchangé sauf son retour (voir `bo-reunions-taches-6`).
- Critères : en deux volets (tablette paysage, ordinateur, 1 440 px), la fiche réunion et la fiche tâche n'ont qu'un `h1` (compter `h1`/`h2` dans la page) ; « Réunions », « Tâches » et le sous-titre gris n'apparaissent plus quand une fiche est ouverte ; le retour dit « ‹ Calendrier » (réunion) et « ‹ Tâches de DA » (tâche) aux quatre dispositions ; titre de 28 px, gras, interlettrage −0,02 em ; aucune pastille « DA » dans la fiche tâche. fr et zh-CN, clair et sombre.
- Test : adapter `tests/agencement-v18-taches.spec.ts` (fiche en deux volets, l. 177-192 ; vérifie « Tâches » et le badge) et `tests/reunions-back-office.spec.ts` / `tests/equipes-reunions.spec.ts` (l. 287 : `getByRole("heading", { level: 2, name: "Réunions" })` ne doit plus exister quand une fiche est ouverte) ; ajouter un test de hiérarchie des titres (un seul `h1`) sur les quatre dispositions plus 1 440 px.
- Vigilance : en deux volets rien ne nomme plus la liste de gauche ; c'est l'en-tête « À venir » qui la nomme (contre de la planche). Le titre de page est « le seul `h1` de la page » (`EnTetePage.tsx`, commentaire d'en-tête) : ne pas en laisser deux.

### bo-reunions-taches-6 · Le retour dit « Réunions » mais mène au Calendrier
- Tranche : T1
- Décision : A · « ‹ Calendrier » partout, avec un lien direct vers `/back-office/calendrier?vue=agenda&filtre=reunions` (le pendant de `bo-reunions-taches-5` A, à coder avec lui).
- À faire :
  - `src/components/reunions/EnTeteReunion.tsx:60` : `retour={{ href: "/back-office/reunions", label: t("backOffice.parties.reunions") }}` devient `{ href: "/back-office/calendrier?vue=agenda&filtre=reunions", label: t("backOffice.entrees.calendrier") }` (« Calendrier » / « 日历 », clé existante).
  - Même retour dans `src/app/back-office/evenements/[id]/modifier/ModifierClient.tsx:46` et `src/app/back-office/evenements/nouveau/NouveauClient.tsx:93`, seulement quand `reunion` est vrai ; les évènements gardent « ‹ Évènements ».
  - Aucune clé de locale.
- Critères : à 393 px, depuis la fiche, « Modifier » et « Nouvelle réunion », le retour s'écrit « ‹ Calendrier » et mène à l'Agenda filtré sur les réunions, sans redirection intermédiaire ; en 中文 « ‹ 日历 » ; mêmes libellés aux quatre dispositions.
- Test : adapter `tests/reunions-back-office.spec.ts` et `tests/equipes-reunions.spec.ts` (liens de retour) : le `href` du retour de la fiche est celui du Calendrier, son nom accessible « Calendrier ».
- Vigilance : le layout deux volets disait déjà « ‹ Calendrier » (`reunions/layout.tsx:26`) ; seule la page à un volet mentait. B (revenir par l'historique) et C (vraie page liste) non retenues.

### bo-reunions-taches-7 · Zone de texte « Description » d'une autre famille
- Tranche : T1
- Décision : A · corriger le composant `Textarea`, pour que les quatre fichiers qui l'importent s'alignent d'un coup.
- À faire :
  - `src/components/ui/textarea.tsx:11` : `min-h-[80px] … rounded-lg border border-input bg-background px-3 py-2` devient `min-h-[96px] … rounded-lg border border-transparent bg-secondary px-3 py-2.5` (mêmes ring, placeholder, `text-base md:text-sm` que `input.tsx:11`). À livrer avec `bo-reunions-taches-13`, pour que libellé et champ changent ensemble.
  - Regarder à l'œil les quatre importeurs (`EvenementForm.tsx:240`, `PrevenirChangements.tsx`, `EditLineSheet.tsx`, `src/app/questionnaire/page.tsx`) et noter les `<textarea>` écrits à la main (`PetitDejCase.tsx:118`, `ReportDialog.tsx:118`, `IdeesSheet.tsx:580`, `editeur/Volets.tsx:335`, `Notifier.tsx:319`) : ils ne suivent pas, rien à y changer ici.
  - Aucune clé de locale.
- Critères : la zone « Description » de « Nouvelle réunion » est un aplat gris sans filet, de la même famille que les champs d'une ligne, en clair et en sombre (en sombre elle n'est plus plus sombre que sa carte) ; hauteur minimale 96 px ; téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px ; fr et zh-CN.
- Test : nouvelle vérification dans `tests/look-fondations.spec.ts` ou `tests/look-secondaires.spec.ts` (jetons et composants, clair et sombre) : le `textarea` de « Description » a `border-style` sans contour visible, fond `--secondary`, hauteur ≥ 96 px ; captures des quatre importeurs.
- Vigilance : la planche donne, pour B (surcharge locale), « la Note d'une tâche garde sa boîte à filet » : c'est un `<Input>` (voir « Chemins corrigés »), l'argument tombe ; A reste la bonne piste. Les cinq `<textarea>` à la main gardent leur ancien dessin tant que personne ne les migre.

### bo-reunions-taches-8 · Le formulaire de réunion parle d'« évènement »
- Tranche : T1
- Décision : A · le même formulaire en mode réunion (vocabulaire, deux champs masqués ou renommés) ; ni deuxième formulaire (B) ni simple changement de libellés (C).
- À faire :
  - `src/components/evenements/EvenementForm.tsx` (la valeur `reunion = estReunion(v)` existe déjà, l. 89) :
    - l. 179 : `evenements.form.titre` devient, quand `reunion`, `evenements.form.titreReunion` : « Nom de la réunion » / « 会议名称 ».
    - l. 185-189 : le champ « Catégorie » (`evenements.form.type`) n'est pas affiché quand `reunion` ; la valeur stockée est celle d'aujourd'hui (voir point à confirmer 3).
    - l. 190-202 : le champ « Public » (`evenements.form.pour`) devient, quand `reunion`, `evenements.form.pourReunion` : « Équipe » / « 团队 », et ses options s'écrivent avec le nom court de l'équipe, en casse normale (`t(cleNomEquipe(equipe, true))` : « DA », « Orga »…, comme la fiche l'écrit, au lieu de `cleNomEquipe(equipe)` qui donne « TEAM ORGA »). Le public « Louange » garde `equipes.public.louange`.
    - l. 244-265 : le bloc « Ajouter une bannière » quand `reunion` entre dans le `<details>` « Plus d'options » (l. 315-364), au-dessus de « Liens » ; il reste visible tel quel pour un évènement.
    - l. 366-371 : le bouton principal dit `evenements.form.createReunion` (« Créer la réunion » / « 创建会议 ») à la création ; en modification, `evenements.form.save` (« Enregistrer » / « 保存 ») inchangé.
  - « Aucune tâche pour cette réunion. » : `src/app/evenements/[id]/TachesEvenement.tsx:84` lit `evenements.taches.vide` (« Aucune tâche pour cet évènement. ») ; quand l'évènement est une réunion (`estReunion(evenement)`), il lit la clé nouvelle `evenements.taches.videReunion` : « Aucune tâche pour cette réunion. » / « 本次会议暂无任务。 ».
  - Les titres de page (« Nouvelle réunion », `backOffice.nouvelleReunion`) sont déjà bons.
- Critères : à 393 px, « Nouvelle réunion » montre « Nom de la réunion », « Équipe » (valeur « DA » en casse normale), Date, Horaire, Lieu, Responsable, Description, « Prévenir les membres », « Plus d'options » (bannière dedans), « Créer la réunion » puis « Annuler » ; aucun mot « évènement » ni « Catégorie » ni « TEAM ORGA » ; un formulaire d'évènement n'a pas changé (« Nom de l'évènement », « Créer l'évènement ») ; fr et zh-CN, clair et sombre ; téléphone, tablette portrait, tablette paysage, ordinateur.
- Test : adapter `tests/equipes-reunions.spec.ts` (l. 216-218, 317-319 : `getByLabel("Nom de l'évènement")` et `getByRole("button", { name: "Créer l'évènement" })` sur la page « Nouvelle réunion » deviennent « Nom de la réunion » et « Créer la réunion » ; l. 361-363 est un évènement d'équipe : inchangé), `tests/agencement-v18-t2a.spec.ts` (l. 219-234) et `tests/evenements-equipe.spec.ts`, ainsi que `tests/taches-evenements.spec.ts:150` (le texte vide d'un évènement ne change pas ; ajouter celui d'une réunion). Chercher les autres tests de réunion avec `grep -ln "Nom de l.évènement" tests/*.ts`.
- Vigilance : le champ de date est en « mm/dd/yyyy » sur les captures (langue du navigateur de test, hors constat). Une variante de libellés dans `EvenementForm` suffit : ne pas dupliquer le formulaire.

### bo-reunions-taches-9 · « Modifier » écrit deux fois
- Tranche : T1
- Décision : C · le titre dit l'action : `h1` « Modifier la réunion », retour « ‹ Réunion DA », ni sous-titre ni titre de carte.
- À faire :
  - `src/app/back-office/evenements/[id]/modifier/ModifierClient.tsx:45-48` : quand `reunion`, `titre` devient `backOffice.modifierReunion` (clé nouvelle : « Modifier la réunion » / « 修改会议 »), le `retour` mène à la fiche de la réunion (`/back-office/reunions/<id>`, label = `evenement.titre`) et le `sousTitre` (`evenements.modifier`) disparaît. Pour un évènement : inchangé (voir « Vigilance »).
  - `src/components/evenements/EvenementForm.tsx:173` : le titre de la carte (`<h2 … {creation ? evenements.nouveau : evenements.modifier}`) est déjà masqué quand `titreCache` est vrai ; vérifier que ModifierClient le passe pour une réunion, et que « Nouvelle réunion » (`NouveauClient`, titre en `EnTetePage`) fait de même.
- Critères : à 393 px, la page de modification d'une réunion n'écrit « Modifier » qu'une fois, dans le seul `h1` « Modifier la réunion » ; le nom de la réunion est dans le premier champ ; même forme que « Nouvelle réunion » ; fr et zh-CN.
- Test : adapter `tests/reunions-back-office.spec.ts` ou `tests/equipes-reunions.spec.ts` (page « modifier » d'une réunion) : `h1` « Modifier la réunion », retour « Réunion DA », aucun autre élément nommé « Modifier » dans l'en-tête.
- Vigilance : le nom de la réunion n'est plus en titre (contre de la planche). Les évènements gardent leur en-tête (titre de l'évènement et sous-titre « Modifier ») tant que la planche ne les couvre pas.

### bo-reunions-taches-10 · « À faire » écrit deux fois
- Tranche : T1
- Décision : C · le segmenté seul, précédé du libellé « État », avec le signe de chaque état (rond vide, rond avec tiret, rond coché) dans chaque segment.
- À faire :
  - `src/components/taches/FicheTache.tsx:237-270` (section d'état) : retirer la rangée « rond + état » (l. 238-250 : le `<span>` décoratif de l. 239-245 et le `<p className="text-base font-bold">` de l. 247). Le sous-titre (« qui a terminé, quand », `sousTitre`, l. 149-151) passe sous le segmenté, `text-[13px] text-muted-foreground`. Au-dessus du segmenté, le libellé « État » visible (`taches.etat.titre`, déjà en place pour l'`aria-label` du `radiogroup` de la l. 251 ; zh-CN « 状态 »), même recette que les libellés de `bo-reunions-taches-13`.
  - Chaque `<button role="radio">` (l. 253-267) reçoit, avant son libellé, le glyphe de la liste des tâches (`TacheLigne.tsx:71-76`) à 14 px : rond `border-2` vide (à faire), rond avec `Minus` (en cours), rond plein avec `Check` (terminée) ; `aria-hidden`, le nom accessible du radio reste le libellé.
  - Portée : Back-Office (`backOffice`), voir point à confirmer 2.
  - Aucune clé de locale.
- Critères : la fiche tâche n'écrit plus l'état qu'une fois (dans le segmenté) ; trois segments de 36 px de haut avec leur signe ; l'état se lit d'un coup d'œil (le segment actif est blanc sur le rail, `--pose` après `back-office-3`) ; environ 50 px gagnés au téléphone ; le même signe dans la liste et dans la fiche ; états « En cours » et « Terminée » (non visibles sur les captures statiques) à contrôler avec une tâche simulée dans chaque état ; fr et zh-CN, clair et sombre ; tablette portrait, tablette paysage, ordinateur, 1 440 px.
- Test : adapter `tests/agencement-v18-taches.spec.ts` (l. 131, 178 : radios « À faire » / « En cours ») et `tests/pages-en-grand-taches.spec.ts` (l. 76-77, 103-107) : le texte « À faire » n'apparaît qu'une fois dans la carte d'état, chaque radio contient un glyphe, le sous-titre est sous le segmenté.
- Vigilance : trois glyphes de plus dans un contrôle de 36 px (contre de la planche) ; l'état ne se lit plus qu'à travers le segmenté en grand. Dépend du jeton `--pose` de `back-office-3` (T3) pour le segment actif en sombre : sans lui, la fiche est correcte en clair seulement.

### bo-reunions-taches-11 · Note et Historique de hauteurs et de corps différents
- Tranche : T1
- Décision : C · l'historique sort des cartes : lignes de 13 px grises au pied de la fiche, sans carte ; la note reste seule en carte pleine largeur.
- À faire :
  - `src/components/taches/FicheTache.tsx:284-299` (branche `backOffice`) : supprimer la grille `md:grid-cols-2` et la carte « Historique » (l. 293-298). La note (l. 287-292) reste dans sa carte `raised`, pleine largeur ; si la tâche n'a pas de note, aucune carte. Dessous, sans carte, les lignes de l'historique (`historique`, l. 176-179), chacune `text-[13px] text-muted-foreground` ; plus de `SousTitre` « Historique » ni de filets.
  - Format de ligne : « Créée par Alix D. le 1 oct. » / « 由 Alix D. 于10月1日创建 » : clé nouvelle `taches.fiche.creeeLe` (« Créée par {{nom}} le {{date}} » / « 由 {{nom}} 于{{date}}创建 »), `date` = `jourCourt` (l. 43). `taches.fiche.creeePar` devient orpheline et est retirée ; `taches.fiche.historique` n'a plus d'usage visible (le garder comme libellé d'accessibilité de la liste, `aria-label`). Les lignes « Commencée par… » / « Faite par… » (`taches.commenceePar`, `taches.faitePar` + `jourCourt`) gardent leur tournure.
  - Plafond de cinq lignes avec « Tout voir » : ne pas coder (voir point à confirmer 5).
- Critères : plus de deux cartes côte à côte qui ne s'alignent ni en hauteur ni en corps ; la note seule en carte, l'historique en petit gris au pied (13 px, `--muted-foreground`) ; tablette (1 540 px de large), ordinateur, 1 440 px ; téléphone ; une tâche sans note ; fr et zh-CN, clair et sombre.
- Test : adapter `tests/agencement-v18-taches.spec.ts` (l. 177-192 : cherche une `section` dont le titre est « Historique » et ses `listitem`) : l'historique devient une liste étiquetée « Historique » hors carte ; ses lignes en 13 px ; texte « Créée par … le … ».
- Vigilance : sur grand écran une carte de note seule peut être large ; la grille à deux colonnes inégales disparaît (comme le pied d'une fiche de Rappels). Un historique long allongerait la page : n'existe pas aujourd'hui.

### bo-reunions-taches-12 · Rangée d'équipes coupée au bord de la carte
- Tranche : T3 (T3c : le formulaire de tâche est dans la liste des « formulaires restants » ; dépend de la primitive `Menu`)
- Décision : B · le menu déroulant unique : « Équipe » avec la valeur « DA ⌄ », 44 px, aplat `bg-secondary`, à toutes les dispositions (A, `flex-wrap`, n'est que le palliatif si T3 tarde).
- À faire :
  - `src/components/taches/TacheForm.tsx:151-164` : les deux branches (`enLigne` avec `Pilules`, l. 152-156 ; sinon `<select id="tache-equipe" className={FIELD}>`, l. 158-163) deviennent un seul contrôle : déclencheur en forme de champ (`h-11 rounded-lg bg-secondary px-3`, valeur courante + chevron 16 px) qui ouvre la primitive `Menu` de T3a avec la liste des équipes (`equipes.map(e => ({ cle: e, nom: t(cleNomEquipe(e, true)) }))`) ; le panneau défile (« … 3 de plus en faisant défiler »). `changerEquipe` (l. 104-109) inchangé. Le champ est enveloppé du composant `Champ` de `bo-reunions-taches-13` (libellé « Équipe »). L'import de `Pilules` (l. 6) est retiré s'il n'est plus utilisé dans le fichier.
  - Aucune clé de locale (`taches.champs.equipe`, `equipes.court.*` existent).
- Critères : sur ordinateur (carte de 480 px) la rangée de neuf pastilles n'est plus coupée au bord (« T » / « 活 » entiers : plus de rangée) ; au téléphone le champ n'est plus un menu natif distinct : même contrôle aux cinq dispositions ; valeur courante lisible, liste ouverte au clavier et au toucher, zone 44 px ; fr et zh-CN, clair et sombre. Le champ n'apparaît que si `equipes.length > 1` (inchangé).
- Test : adapter `tests/agencement-v18-taches.spec.ts` (l. 219-240, « Nouvelle tâche ») et `tests/equipes-taches.spec.ts` (le formulaire de tâche avec plusieurs équipes) : ouvrir le menu « Équipe », choisir une autre équipe, vérifier la valeur ; aucun débordement horizontal de la carte (`scrollWidth <= clientWidth`) ; plus de `select#tache-equipe` visible.
- Vigilance : voir point à confirmer 1 (`<select>` habillé ou `Menu` dans un formulaire). Changer d'équipe est rare : un menu convient. Si T3 tarde, A (flex-wrap, `gap-2`) en palliatif ; il diffère alors du téléphone.

### bo-reunions-taches-13 · Deux recettes de libellés dans le même Back-Office
- Tranche : T1
- Décision : A · un composant `Champ` dans `src/components/ui/` : libellé de 13 px semi-gras `--muted-foreground`, à 6 px au-dessus d'un champ de 44 px, rayon 12, aplat `bg-secondary`, sans bordure ; la zone de texte (`bo-reunions-taches-7`) et le menu (`bo-reunions-taches-12`) suivent la même recette.
- À faire :
  - Nouveau `src/components/ui/champ.tsx` : `Champ({ id, label, children, className })` rend `<div className="space-y-1.5">` + `<label htmlFor={id} className="text-[13px] font-semibold text-muted-foreground">` + l'enfant. Pas d'`Input` global à 44 px : le champ s'écrit `<Input className="h-11" …>` aux appels de ces deux formulaires, `input.tsx` (`h-10`) ne change pas (le reste du site garde 40 px jusqu'à T4).
  - `src/components/taches/TacheForm.tsx:17-18` : `LABEL = "text-xs font-semibold"` et `FIELD = "w-full h-10 rounded-lg bg-secondary px-3 text-base md:text-sm"` disparaissent ; les 13 libellés (`className={LABEL}`) passent par `Champ` ; `FIELD` des `<select>` (l. 160, 180, 217, 228, 240, 250) devient `h-11` (habillage complet du `<select>` : `partout.md`, T3a).
  - `src/components/evenements/EvenementForm.tsx:104-105` : `field` et `LABEL` (`text-sm text-muted-foreground`) disparaissent de la même façon ; 14 libellés `LABEL` plus celui de `Periode` (l. 54, `text-sm text-muted-foreground` écrit en dur) ; `field` (l. 186, 192) devient `h-11`.
  - Contraste : `--muted-foreground` clair `#6c6c72` et sombre `#98989f`, environ 5:1 et 6:1.
  - Aucune clé de locale.
- Critères : les formulaires « Nouvelle tâche » et « Nouvelle réunion » ont les mêmes libellés (13 px semi-gras gris, 6 px au-dessus), les mêmes champs (44 px, rayon 12, aplat gris) ; tâche : Équipe, Titre, Échéance, Responsable, Note ; réunion : Nom, Date, Horaire, Lieu, Responsable, Description ; clair et sombre ; fr et zh-CN ; téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px.
- Test : adapter `tests/agencement-v18-taches.spec.ts` (l. 219-240) et `tests/look-secondaires.spec.ts` ou `tests/look-fondations.spec.ts` (mesure : `fontSize` 13 px, `fontWeight` 600, couleur `--muted-foreground`, hauteur de champ 44 px, dans les deux formulaires, sur les cinq projets).
- Vigilance : une primitive de plus à faire adopter ailleurs (contre de la planche) ; ne migrer que ces deux formulaires ici. Piste C (formulaire en lignes groupées « à la façon des Réglages ») écartée : mauvaise pour Titre, Note et Description.

### bo-reunions-taches-14 · Feuille « Nouvelle tâche » : répétition en demi-largeur, bouton à gauche
- Tranche : T1
- Décision : A · « Répétition » pleine largeur ; « Créer la tâche » pleine largeur de 50 px, « Annuler » en texte dessous.
- À faire :
  - `src/components/taches/TacheForm.tsx:225-246` (branche feuille, non `enLigne`) : le conteneur de « Répétition » passe de `grid grid-cols-2 gap-3` à une colonne ; `rang` (« Quelle semaine du mois », l. 237-245) se range sous la répétition, pleine largeur aussi. La ligne `anAide` (l. 235) reste.
  - Actions (l. 276-284) : à la création, `<Button type="submit" className="h-[50px] w-full">` « Créer la tâche » (`taches.creer`) ; à la modification, « Enregistrer » (`taches.enregistrer`) au même gabarit. `<Button type="button" variant="ghost" className="h-11 w-full">` « Annuler » (`taches.annuler`) dessous, centré, cible de 44 px. « Supprimer » (`onDelete`, l. 279-283) reste en dessous, inchangé. Même motif que la feuille « Nouvelle réunion » au téléphone.
  - Aucune clé de locale (`taches.creer` existe : « Créer la tâche » / « 创建任务 », `taches.annuler` : « 取消 »).
- Critères : à 393, 375 et 360 px (calculé depuis 393 px dans la planche, à mesurer), « Répétition » occupe toute la largeur du formulaire, le bouton principal est pleine largeur (50 px) et « Annuler » en texte dessous ; le libellé est « Créer la tâche » sur téléphone comme sur ordinateur ; fr et zh-CN ; clair et sombre.
- Test : adapter `tests/agencement-v18-taches.spec.ts` / `tests/equipes-taches.spec.ts` (feuille « Nouvelle tâche » ; ces specs cliquent « Enregistrer » à la création, à passer à « Créer la tâche » là où c'est la feuille), mesures de largeur du bouton et du champ « Répétition » à 360 et 393 px sur le projet téléphone.
- Vigilance : « À confirmer » dans la planche : les mesures à 360 px sont calculées. Le « Quand c'est fait, prévenir » reste à sa place (`TacheForm.tsx:248-260`). « Répétition » est un menu natif au téléphone et un rail à cinq choix sur ordinateur : relève de T3 (chantier 3), non traité ici.

### bo-reunions-taches-15 · « 10/28 » en 中文
- Tranche : T1
- Décision : B · date courte en mots dans les deux langues : « 28 oct. » et « 10月28日 », comme l'historique de tâche et la carte du compte rendu.
- À faire :
  - `src/components/reunions/SujetsAborder.tsx:33-36` : `dateCourte` passe de `{ day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }` à `{ day: "numeric", month: "short", timeZone: "Europe/Paris" }`, la même option que `CompteRenduCarte.tsx:20-23`. Mettre à jour le commentaire (« 28 sept. » / « 9月28日 »).
  - La troisième copie, `FicheTache.tsx:43` (`jourCourt`), a les mêmes options sans `timeZone` ; ne pas y toucher ici (point de vigilance).
  - Aucune clé de locale.
- Critères : « Alix D. · 28 oct. » en français et « Alix D. · 10月28日 » en chinois dans la liste des sujets, comme la date de la réunion et celle du compte rendu ; un seul format de date courte dans la fiche.
- Test : adapter `tests/reunions.spec.ts` : l. 184 (`"Alice Q. · 28/09"`), 196 (`"Bruno M. · 02/10"`), 355, 513, 519 et 541 (`"· 01/10 · non traité"`, `"· 01/10 · repris du 3 octobre"`, `"· 01/10 · repris le 7 novembre"`) deviennent « 28 sept. », « 2 oct. », « 1 oct. » ; ajouter le cas zh-CN (« 10月28日 »).
- Vigilance : la date relative (C, « il y a 6 jours ») est écartée : en préparation de réunion on veut une date. `FicheTache.jourCourt` n'a pas de fuseau : une date proche de minuit peut différer de celle de Paris ; hors constat, à signaler seulement.

### bo-reunions-taches-16 · Bouton désactivé blanc sur gris
- Tranche : T1
- Décision : A · un état désactivé visible : fond `--secondary`, texte `--muted-foreground`, sans opacité, pour tous les boutons du site (réponse à la question 4 de la planche : une seule règle dans `button.tsx`).
- À faire :
  - `src/components/ui/button.tsx:10` : retirer `disabled:opacity-50` de la base et ajouter `disabled:bg-secondary disabled:text-muted-foreground disabled:border-transparent` (`disabled:pointer-events-none` reste). En sombre cela donne `#2c2c2e` et `#98989f`.
  - `grep -rn "disabled:opacity" src --include=*.tsx` : 44 fichiers ajoutent leurs propres `disabled:opacity-50` ; `tailwind-merge` (`cn`) ne résout pas un conflit avec la variante : regarder les écrans qui ont un bouton désactivé (formulaire de tâche, de réunion, compte rendu, sujets, setlists, planning) et ne retirer l'opacité locale que là où elle cache la règle. `TacheLigne.tsx:69` (rond de la liste de tâches) et `CompteRenduCarte.tsx:84` (croix) ne sont pas des `Button` : hors portée.
  - Le bouton désactivé qui vit dans un champ gris (`bo-reunions-taches-4`) : même `--secondary` sur `--secondary` ; lui donner un texte `--muted-foreground` seul, sans aplat, pour qu'il reste lisible comme « pas encore » et qu'il ne disparaisse pas.
  - Aucune clé de locale.
- Critères : « Enregistrer » (lien de compte rendu) et « Ajouter » (sujets) vides se lisent « pas encore » (gris clair sur fond gris, texte grisé), pas « bouton blanc à moitié transparent » ; à l'activation le bouton prend l'encre sans saut de taille ; les variantes `outline` et `ghost` désactivées restent lisibles ; clair et sombre ; téléphone, tablette portrait, tablette paysage, ordinateur.
- Test : nouvelle vérification dans `tests/look-fondations.spec.ts` (bouton désactivé d'un des deux champs : `opacity` à 1, fond `--secondary`, couleur `--muted-foreground`, clair et sombre) ; captures d'au moins cinq écrans qui ont un bouton désactivé.
- Vigilance : touche tous les boutons désactivés du site ; à regarder sur les écrans qui en ont (contre de la planche). B (bouton qui n'apparaît qu'avec du texte) et C (jamais désactivé) non retenues.

### bo-reunions-taches-17 · Ordre des cartes de la fiche réunion
- Tranche : T1
- Décision : A · ordre fixe : Sujets, Compte rendu, Tâches. Une colonne dans cet ordre ; deux colonnes : Sujets à gauche, Compte rendu puis Tâches à droite.
- À faire :
  - `src/app/back-office/evenements/gestion.module.css:15` : `grid-template-areas: "droite" "sujets" "taches"` devient `"sujets" "droite" "taches"` (colonne seule : sujets, puis le bloc compte rendu et réunions précédentes, puis tâches). Les deux colonnes (l. 19-25, `@container (min-width: 640px)`) sont déjà `"sujets droite" "sujets taches"` : inchangées.
  - `src/app/evenements/[id]/EvenementClient.tsx:216-231` : l'ordre dans le DOM (sujets, droite, tâches) est déjà le bon ; rien à toucher.
  - Aucune clé de locale.
- Critères : au téléphone et en volet étroit, Sujets en tête, puis Compte rendu, puis Tâches ; en deux colonnes l'ordre de lecture d'une colonne reste celui des deux ; clair et sombre ; fr et zh-CN ; téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px.
- Test : adapter `tests/reunions-back-office.spec.ts` (fiche du Back-Office, ordre des cartes `data-zone`) : à 393 px la position verticale de `[data-zone="sujets"]` est inférieure à celle de `[data-zone="droite"]`, elle-même inférieure à celle de `[data-zone="taches"]`.
- Vigilance : avant la réunion, le compte rendu vide passe après les sujets ; après la réunion, on fait défiler les sujets pour l'atteindre (B, « selon le moment », a été écartée : les cartes ne changent pas de place d'une visite à l'autre).

### bo-reunions-taches-18 · Agenda à 1 440 px : deux marges droites
- Tranche : T1
- Décision : A · la marge de page dans le panneau du jour (`padding-right: var(--marge-page)`).
- À faire :
  - La planche demande `padding-right: var(--marge-page)` pour le panneau du jour ; il est déjà posé à `CalendrierClient.tsx:518` (`pr-[var(--marge-page)]`, retouche BO16 a, vérifiée par `tests/calendrier.spec.ts:1682-1715`, qui n'exige que `≤ bord + 1`). La planche mesure pourtant le contenu du panneau à environ 38 px avant le bord du bouton « Ajouter » (x ≈ 1 362 contre 1 400). Mesurer d'abord à 1 440 px : bord droit du bouton « Ajouter » (en-tête, `EnTetePage` `action`) et bord droit de la dernière carte du volet (`getBoundingClientRect`), puis du `aside` (`:517`, 300 px) et de son conteneur.
  - Si l'écart persiste malgré `pr-[var(--marge-page)]`, c'est que l'`aside` ne finit pas au même bord que l'en-tête (un conteneur plafonné autour de l'un des deux, `--largeur-lecture`, 1 440 px, ou la barre latérale dans la mesure) : aligner les deux bords au même conteneur (piste C, une seule grille) plutôt qu'ajouter du padding. Sinon, rien à coder et l'entrée se réduit au test.
  - Aucune clé de locale.
- Critères : à 1 440 px (et à tablette paysage, ordinateur), le bord droit de la dernière carte du panneau du jour et celui du bouton « Ajouter » de l'en-tête sont au même x à 1 px près ; le panneau garde ses 300 px et va jusqu'au bord ; fr et zh-CN ; clair et sombre.
- Test : renforcer `tests/calendrier.spec.ts:1682` (BO16 a) : remplacer `toBeLessThanOrEqual(bord + 1)` par une égalité à 1 px avec le bord droit du bouton « Ajouter » (`getByRole("button", { name: "Ajouter" })`), à 1 440 px et à tablette paysage. Spec déjà dans `SPECS_GRAND_ECRAN`.
- Vigilance : l'écart de la planche est mesuré sur la capture ; le code porte déjà le correctif demandé : ne pas le doubler. Le plus gros bouton « Ajouter ce jour-là » (B) et le conteneur de grille commun (C) restent des replis.

### bo-reunions-taches-19 · « Scène des fêtes » réduit à une icône au téléphone
- Tranche : T1
- Décision : B · la pastille avec son nom, comme sur tablette, si le dessin tient à 360 px ; sinon A (icône gardée, nom en `aria-label` et `title`). Réponse à la question 5 de la planche.
- À faire :
  - `src/app/back-office/calendrier/CalendrierClient.tsx:413-420` (`sceneDesFetes`) : retirer `max-[479px]:hidden` du `<span>` (l. 417) ; bouton à contour de 36 px de haut (`size="sm"`), icône plus « Scène des fêtes » en 14 px (`backOffice.calendrier.sceneDesFetes` : « Scène des fêtes » / « 节日舞台 »). L'`aria-label` existant reste.
  - Mesurer à 360 px en français avant de garder B : la ligne du titre « Calendrier » + pastille doit tenir avec sa marge (16 px de chaque côté, `EnTetePage`) sans troncature ; sinon A : remettre `max-[479px]:hidden`, ajouter `title={t("backOffice.calendrier.sceneDesFetes")}` au `Link` (nom accessible déjà posé). Le bouton « Ajouter » n'est pas dans cette rangée au téléphone (rond flottant, `telephone && peutCreer`, l. 440).
  - Aucune clé de locale.
- Critères : à 393 et 360 px, en français comme en 中文, la pastille « Scène des fêtes » (ou son repli A) tient sur la rangée du titre sans le tronquer, marge de 16 px conservée ; même bouton aux quatre dispositions ; zone de toucher 44 px.
- Test : adapter `tests/calendrier.spec.ts:1646-1660` (BO-C « Scène des fêtes ») : le lien « Scène des fêtes » est visible avec son texte au téléphone (projet téléphone, viewport 360 puis 393) et ne déborde pas de la ligne (`getBoundingClientRect` du lien et du titre).
- Vigilance : « À confirmer » dans la planche : la marge à 360 px est mince, mesure du dessin et non du site ; la mesure réelle tranche entre B et A. Piste C (menu « … ») écartée : un tap de plus pour une entrée de saison.

### bo-reunions-taches-20 · « Annuler » en sombre : barre noire pleine
- Tranche : T1
- Décision : B pour « Annuler » (bouton texte, sans fond ni contour, `text-foreground`, 44 px, dans les deux thèmes), avec A pour le reste : le jeton `--pose` pour le segmenté « Répétition » et « Nouvelle tâche ».
- À faire :
  - `src/components/taches/TacheForm.tsx:272` : `<Button type="button" variant="outline" className="rounded-full" onClick={onClose}>` devient `variant="ghost" className="h-11 text-foreground"` (même recette que la feuille, l. 278). Bouton principal inchangé (l. 273).
  - Le formulaire de réunion est déjà ainsi (`EvenementForm.tsx:370`, `variant="ghost"`) : vérifier seulement `text-foreground` (aujourd'hui `text-muted-foreground`) pour que « Annuler » s'écrive pareil dans les trois formulaires.
  - `--pose` : le jeton, l'ombre du segment actif et le remplacement de `bg-background` par `bg-pose` dans `button.tsx:18` (variante `outline`, donc « Nouvelle tâche »), `Onglets.tsx:85` (curseur du rail de « Répétition ») sont l'entrée `back-office-3` de l'annexe `back-office.md`, T3 : rien à coder ici. Avant cette tranche, « Nouvelle tâche » et le segmenté restent noirs en sombre.
  - Aucune clé de locale.
- Critères : en sombre, à 1 440 px, « Annuler » n'est plus une barre noire pleine : c'est un texte `text-foreground` de 44 px de haut, sans fond ni contour, comme au téléphone et dans le formulaire de réunion ; « Créer la tâche » reste le seul bouton plein ; en clair rien ne change visuellement ; (après `back-office-3`) le segment « Une fois » de Répétition et « Nouvelle tâche » dans la fiche réunion sont en `#3a3a3c` ; ordinateur et 1 440 px, fr et zh-CN.
- Test : adapter `tests/agencement-v18-taches.spec.ts:219-240` (« Annuler · Créer la tâche » en bas à droite) : « Annuler » sans fond (`backgroundColor` transparent) ni contour dans les deux thèmes, hauteur 44 px ; l'ordre et la position à droite restent.
- Vigilance : « Annuler » en variante `outline` (A seul) resterait de même poids que l'action principale (contre de la planche) : d'où B. Piste C (contour visible sur la carte) écartée : une recette de bouton de plus.
