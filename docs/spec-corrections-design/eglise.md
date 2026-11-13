# Annexe de spec · corrections du design · groupe Évènements, guide, connexion

Source : planche `docs/planches/planche-corrections-eglise.html` ; décisions : recommandations (Timothée, 03/11/2026)

Seize constats retenus. Écartés, non repris : eglise-10 (carte de gestion avant « quand » et « où » : voulu et tranché, `docs/spec-evenements-look.md:123-132`) et eglise-14 (barre réduite sans libellé en tablette paysage : voulu, `docs/spec-navigation-grand-ecran.md` Q5). eglise-2 n'existe pas dans la planche. Aucun constat gelé. Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| eglise-8 | T1 | petit |
| eglise-1 | T1 | petit |
| eglise-4 | T1 | petit à moyen |
| eglise-7 | T1 | petit |
| eglise-6 | T1 | moyen |
| eglise-11 | T1 | très petit |
| eglise-13 | T1 | petit |
| eglise-18 | T1 | petit |
| eglise-9 | T1 | petit |
| eglise-15 | T1 | très petit |
| eglise-16 | T1 | très petit |
| eglise-17 | T1 | très petit |
| eglise-3 | T2 | petit |
| eglise-12 | T2 | très petit |
| eglise-19 | T4 | très petit |
| eglise-5 | T5 | gros, surtout mécanique |

Nombre d'entrées par tranche : T1 12, T2 2, T3 0, T4 1, T5 1.

Classements à relire (la règle « un constat qui n'est qu'un exemple d'un chantier va dans la tranche du chantier ») :
- eglise-3 va en T2 : une carte `bg-card` blanche sur fond blanc est le défaut même que la recette de surface traite ; la décision A (`.raised`) reste celle de la planche et T2 ne retouchera ensuite que la définition de `.raised`.
- eglise-12 va en T2 : les halos de la connexion sont bleu/rouge de marque, pas une couleur de service ou de section, donc hors du périmètre « halos » de T1 ; retirer fond et halos du bandeau est une affaire de surface.
- eglise-19 va en T4 : une astuce qui passe de 12 px à la taille du corps est un exemple de l'échelle B (plancher 12 px).
- eglise-5 va en T5 : captures du guide en 中文, à refaire après T2-T4 (les captures montrent l'interface).

Ordre dans T1 : eglise-16 (clé du nom chinois) avant eglise-11 et eglise-13 (même fichiers de langue) ; eglise-4 avant eglise-3 si les deux se codent le même jour (le test des cartes mesure la vignette) ; eglise-18 et eglise-7 touchent tous deux `src/app/guide/page.tsx` : eglise-7 d'abord (la bande entre dans la grille), puis eglise-18 (sommaire téléphone).

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte au bon endroit, jamais par `json.dump`.
- Zones gelées intactes : logo (pastille blanche), `serviceColors.ts`, accords et sections, `--primary`, `--sec-chorus`. La teinte de l'évènement est `PLANNING_COLORS.scene` à `--svc-tint`.
- Aucun nom réel de membre dans les tests : noms fictifs (les maquettes de la planche en emploient déjà).
- Toute spec qui teste l'agencement d'une page évènement ou guide en grand écran passe par `tests/pages-en-grand-evenements.spec.ts` ou `tests/pages-en-grand-guide-equipes.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`, motif `pages-en-grand-.*`) ; `tests/agencement-v18-t7.spec.ts` et `tests/evenements.spec.ts` n'y sont PAS (trois appareils) : y ajouter la spec si elle mesure une disposition.

---

## T1 · corrections immédiates

### eglise-8 · « Partager » sort de l'écran sur téléphone (barre de la fiche d'évènement)
- Tranche : T1
- Décision : A, « Gérer » devient une pastille ronde comme « Partager » sous 640 px ; libellé complet dès 640 px, avec l'icône réglages.
- À faire :
  - `src/app/evenements/[id]/EvenementClient.tsx:337-340` (lien « Gérer », barre `data-testid="barre-fiche"`, branche un volet `if (!backOffice)`) : sous `sm` (640 px), rond `.raised` de 40 × 40 px (`h-10 w-10 p-0`, zone tactile de 44 px par `relative after:absolute after:-inset-0.5 after:content-['']`), libellé en `sr-only` (`<span className="max-sm:sr-only">`) ; dès `sm` : `px-4` et libellé visible. `aria-label` et `title` = `t("backOffice.gerer")` (fr « Gérer dans le Back-Office » / zh 「在后台管理」, clé existante `backOffice.gerer`, `src/locales/fr.json:3649` et `zh-CN.json:3606`, aucun libellé nouveau). Écart entre les deux pastilles : `gap-2` (8 px), déjà là.
  - Même fichier : remplacer `ArrowRight` (l. 339) par `Settings2` de `lucide-react` (18 px dans le rond, `h-4 w-4` dès `sm`). `Settings2` n'est utilisé nulle part encore : l'ajouter à l'import. Retirer la flèche « → » aussi dans la branche grand écran (l. 298-304, `<ArrowRight aria-hidden />` du `Button asChild variant="outline"`), pour que les deux branches disent la même chose ; si `ArrowRight` n'est plus utilisé après coup, nettoyer l'import.
  - `Partager` (l. 84-120, `compact`) cache déjà son libellé sous `sm` (`max-sm:sr-only`, l. 111) : rien à changer, c'est l'autre moitié du problème. Total attendu à 320 px : retour environ 102 px + 40 + 40 + écarts, soit environ 210 px.
  - Grand écran (≥ 1 024 px, commun aux trois pistes de la planche) : les deux boutons montent de la rangée du titre (`flex items-end gap-3`, l. 295-306) sur la rangée des étiquettes (`TypePour`, dans `TitreEvenement`, `EvenementCard.tsx:76-83`), alignés à droite ; le titre prend toute la largeur dessous et tient sur une ligne à 1 280 px. La planche signale qu'à 1 280 px la rangée d'étiquettes (environ 150 px) plus les boutons (environ 330 px) dépasse la colonne de la fiche (462 px) d'une quinzaine de pixels : décision recommandée, deux lignes d'étiquettes acceptées (`flex-wrap`), à regarder sur la vraie page ; repli si c'est laid, « Partager » en rond seul sous 1 440 px comme sur téléphone.
  - Correction de la planche : elle écrit `EvenementClient.tsx:333-345` ; le lien « Gérer » occupe les lignes 337-340 et la barre 332-345, c'est bien le bon fichier.
- Critères : téléphone à 320, 360 et 390 px, français ET 中文 : `document.documentElement.scrollWidth === clientWidth` (plus de défilement latéral) et « Partager » entièrement dans l'écran (`boundingBox().x + width <= viewport`), les deux ronds de 40 px avec zone de 44 px. Tablette portrait (820 px, barre de 672 px) : libellé complet « Gérer dans le Back-Office » et pastille « Partager » avec libellé, sans casse. Ordinateur 1 280 px : le titre ne se casse plus entre deux boutons (« Pique-nique de rentrée » sur une ligne). 1 440 px : inchangé à l'œil. Tablette paysage (1 080 px, barre latérale réduite) : même règle que l'ordinateur, à vérifier sur la vraie page (la planche ne l'a pas capturée). Clair et sombre.
- Test : nouvelle vérification dans `tests/pages-en-grand-evenements.spec.ts` (le fichier est sur les cinq projets) : `scrollWidth` contre `clientWidth`, avec et sans le bouton « Gérer », pour séparer les deux causes (voir vigilance) ; à 320/360/390 px, fr et zh-CN ; `tests/agencement-v18-t7.spec.ts:213-221` (lien « Gérer » en contour à côté du titre, grand écran) reste vrai pour la branche grand : le relancer.
- Points de vigilance de la planche : sur `bar-fr-360.png` la cloche de l'en-tête est aussi coupée ; la cause peut être le défilement provoqué par la barre, ou l'en-tête lui-même (logo, sélecteur App / Musiciens / Back-Office, cloche) qui ne tiendrait pas à 360 px. Le test mesure `scrollWidth` avec et sans le bouton « Gérer » pour séparer les deux ; si c'est l'en-tête, c'est un constat à part (le signaler, ne pas le corriger ici). Le défaut est masqué à 412 px (largeur de la capture d'origine) : ne jamais tester à cette seule largeur. Tout responsable d'évènement le voit (un membre ordinaire n'a pas « Gérer »).

### eglise-1 · Le rond « + » couvre « S'inscrire » (liste des évènements, téléphone)
- Tranche : T1
- Décision : B, pilule « + Nouvel évènement » dans le flux, en bas de la liste, comme « Proposer un chant » sur Chants (exception R7 déjà admise).
- À faire :
  - `src/components/layout/BoutonNouveau.tsx:18-23` (`CLASSE`) : le rond fixe `fixed bottom-[calc(var(--tabbar-bottom)+76px)] right-4` est la cause. Ajouter une variante (prop `dansLeFlux`) qui, sous 768 px, rend une pilule statique de 44 px (`h-11 px-5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold`, `Plus` de 16 px + libellé visible, sans `sr-only`), et garde la pilule d'en-tête dès `md`. Les autres usages (`SongProposalDrawer.tsx:120`, `OrganigrammeGroupe.tsx:277`, `EnTetePage` des tâches) ne changent pas.
  - `src/app/evenements/SectionEvenements.tsx:39` : l'action d'en-tête (`BoutonNouveau label={t("evenements.nouveau")}`) reste pour `md` et plus ; la cacher sous `md` (`max-md:hidden`, comme `SongProposalDrawer.tsx:119`).
  - `src/app/evenements/CalendrierClient.tsx:163` (juste avant `<GuideLien section="evenements" />`, fin de la liste) : poser la variante dans le flux, alignée à gauche sur la gouttière de 16 px, 24 px sous la dernière carte et au-dessus de « Comment ça marche ? », visible seulement sous `md` et si `peutCreer` (prop déjà reçue par `CalendrierClient`, l. 38-41). `CalendrierClient` n'a pas le lien du bouton : lui passer l'adresse `/back-office/evenements/nouveau` (ou rendre le bouton depuis `SectionEvenements`).
  - Libellés : clé existante `evenements.nouveau` (fr « Nouvel évènement », `fr.json:2245`; zh 「新建活动」, `zh-CN.json:2213`), aucune clé nouvelle.
  - Correction de la planche : elle cite `BoutonNouveau.tsx, SectionEvenements.tsx` ; il faut aussi `CalendrierClient.tsx`, qui porte le bas de la liste.
- Critères : téléphone (390 px, et 320 px), fr et 中文, clair et sombre : plus rien ne flotte sur le contenu, « S'inscrire » et « 12 déjà inscrits · 28 places restantes » entièrement visibles au repos et en défilement ; pilule de 44 px de haut au bas de la liste ; avec dix évènements, il faut défiler pour créer (contre assumé). Dès 768 px (tablette portrait, paysage, ordinateur, 1 440 px) : rien ne change, pilule dans l'en-tête. Un membre sans droit de création ne voit aucune pilule.
- Test : `tests/evenements-2027.spec.ts` (agenda public, trois appareils) ou une nouvelle vérification dans `tests/pages-en-grand-evenements.spec.ts` : sur téléphone, la boîte de la pilule ne recouvre aucun bouton « S'inscrire » (intersection nulle à scroll 0), `position` calculée différente de `fixed`.
- Points de vigilance de la planche : diagnostic corrigé, ce n'est pas une page trop courte (`pb-16` plus la cale de 78 px suffisent) : ajouter de la marge ne corrige rien. Alternative écartée par la recommandation : retirer la création côté App (C) ; l'indice « rien de prévu » qui lit `peutCreer` (`CalendrierClient.tsx:112`) n'est donc pas touché. La maquette Back-Office de la planche n'a que deux lignes (le rond n'y recouvre rien) : hors périmètre de cette entrée.

### eglise-4 · Un évènement sans image affiche un aplat gris (cadre 16/9)
- Tranche : T1
- Décision : B, vignette de date de 56 × 56 px à la place du cadre gris.
- À faire :
  - `src/app/evenements/EvenementCard.tsx:60-72` (`Banniere`) : sans image (cas `!e.images[0]`), ne plus rendre le cadre `aspect-[16/9] bg-secondary` avec `ImageIcon` : retourner `null` (l'info sans image le fait déjà, l. 61). Avec une image, rien ne change. Retirer l'import `Image as ImageIcon` (l. 12) devenu orphelin.
  - Carte (`EnteteEvenement`, l. 129-137, et `EvenementCarte`, l. 192-199) et fiche en un volet (`EvenementClient.tsx:356`, `EnteteEvenement`) : quand il n'y a pas d'image et que l'évènement n'est pas une info, placer à gauche du bloc badges + titre (`TitreEvenement`, l. 76-84) une vignette de 56 × 56 px, rayon 12 px, 16 px d'écart, alignée en haut. Faire porter la vignette par `Tile` (`src/components/ui/tile.tsx`) avec une taille `xl` (`h-14 w-14 rounded-xl`, jour en 22 px gras, mois en 12 px demi-gras ; `size` ne connaît aujourd'hui que `md` et `lg`) : couleur `COLOR` (`PLANNING_COLORS.scene`), fond `--svc-tint` (13 % clair, 26 % sombre) et texte `styleTexteService`/`.svc-ink` déjà gérés par `Tile`. Jour `Number(e.date.slice(8, 10))`, mois `monthLabel(e.date, i18n.language)` (`EvenementCard.tsx:27`, déjà là) : « 14 » / « nov. » en français, « 14 » / 「11月」 en chinois.
  - La fiche en grand (`EvenementClient.tsx:296-327`) ne change pas : elle commence déjà par son titre et n'affiche `Banniere` que s'il y a une image (l. 309, « plus de cadre gris »).
  - Pas de clé de langue nouvelle.
- Critères : téléphone (390 px) : environ 195 px de gagnés sur la carte sans image ; tablette portrait (820 px, fiche) : environ 360 px de gagnés ; la vignette est la même famille que celle de l'agenda en grand (`Tile` de 44 px, `EvenementCard.tsx:232`). Une carte avec image est inchangée. Une info (sans date) n'a pas de vignette. fr et 中文 (mois en 「11月」), clair et sombre (texte éclairci par `.svc-ink`). Tablette paysage, ordinateur et 1 440 px : la liste en grand et la fiche en deux volets ne changent pas.
- Test : adapter `tests/agencement-v18-t7.spec.ts:179-202` (`getByTestId("banniere")`, qui attend la bannière dans le volet : le cas « sans image » doit maintenant attendre `toHaveCount(0)` et la vignette `getByTestId("tuile")`) ; ajouter, dans `tests/pages-en-grand-evenements.spec.ts`, la mesure de la vignette (56 × 56) sur téléphone et tablette portrait, fr et zh-CN.
- Points de vigilance de la planche : la date figure deux fois dans la carte (vignette et ligne « Samedi 14 novembre 2026 ») : acceptée, ne pas retoucher `InfosEvenement` (le test « la date n'est pas en gras », `evenements.spec.ts`, doit rester vrai). Une liste de plusieurs évènements ou avec de vraies images n'a pas été capturée : regarder une liste de cinq évènements avant de figer.

### eglise-7 · La bande « Pour toi, en 1 carte » n'est ni sur le sommaire ni sur la colonne
- Tranche : T1
- Décision : A, la bande devient la première rangée de la grille, sur toute sa largeur.
- À faire :
  - `src/app/guide/page.tsx:177-192` (bloc `mb-5 px-[var(--marge-page)]` / `max-w-[calc(720px+2*var(--marge-page))] ... rounded-2xl bg-secondary px-4 py-3`) : sortir la bande de son conteneur propre et la poser dans la grille (l. 193-199, `grid grid-cols-[260px_minmax(0,720px)] gap-x-10` en grand) comme premier enfant avec `col-span-full` (`grid-column: 1 / -1`), soit x 288 à 1240 à 1 280 px : ses deux bords tombent sur ceux du sommaire et du contenu. Retirer le `max-w-[calc(720px+2*...)]` qui fait la largeur arbitraire (x 288 à 1087). Hors grille (tablette portrait, téléphone), la bande reste dans le conteneur `max-w-[calc(720px+2*var(--marge-page))] space-y-6` : en tête, même largeur que les sections.
  - Même fichier, conséquence : le sommaire collant (`sticky top-[calc(var(--nav-h)+24px)]`, l. 129) démarre environ 58 px (hauteur de la bande) plus 24 px d'écart plus bas ; acceptée.
  - Libellés : sans changement dans cette entrée. Hors constat (à valider avec Timothée, ne pas coder sans accord) : `accueil.pourToi` (« Pour toi, en {{count}} carte(s) ») ne dit pas ce qu'il propose ; piste « Une visite en 1 carte, faite pour toi ».
- Critères : ordinateur 1 280 px et 1 440 px : bord gauche de la bande = bord gauche du sommaire (x 288 à 1 280 px) et bord droit = bord droit de la colonne de lecture (x 1 240 à 1 280 px). Tablette paysage (1 080 px, sommaire collant également) : mêmes alignements. Tablette portrait et téléphone : la bande a la largeur des sections. fr et 中文 (「为你准备的 1 张卡片」 / 「重看导览」), clair et sombre.
- Test : adapter `tests/pages-en-grand-guide-equipes.spec.ts` (déjà sur cinq projets) : mesurer `boundingBox()` de la bande contre celui du `nav` du sommaire (`left`) et de la dernière section (`right`) ; tolérance 1 px. `tests/guide-b6.spec.ts` si elle mesure le haut de page.
- Points de vigilance de la planche : la bande pleine largeur repousse le sommaire collant d'environ 58 px + 24 px d'écart. Alternatives écartées : B (bande dans la colonne du sommaire) et C (alignée sur la colonne de lecture seulement).

### eglise-6 · Captures du guide éblouissantes en sombre, illisibles sur téléphone
- Tranche : T1
- Décision : A, adoucir en sombre par un filtre et ajouter un bouton « Agrandir » ouvrant la capture à sa largeur réelle.
- À faire :
  - `src/components/guide/GuideFigure.tsx:99-134` (`GuideFigure`) : le cadre `relative w-full overflow-hidden rounded-lg border border-border bg-secondary/40` devient un passe-partout de 6 px en `--secondary` avec liseré `border-foreground/15` (au lieu de `--border`). En sombre seulement (`dark:`), l'`<img>` (l. 112-118) reçoit `filter: brightness(.85) contrast(.95)` ; les annotations (`Shapes` et `Labels`, HTML et SVG posés par-dessus) restent hors filtre. Valeur du filtre : commencer à `.85` / `.95`, comparer à `brightness(.70)` sur la vraie page en sombre avant de figer ; la capture adoucie reste le bloc le plus clair de l'écran, l'essai à `.70` est dans la planche.
  - Bouton « Agrandir la capture » en coin haut droit de la figure, zone de 44 px, à toutes les tailles ; sur ordinateur (pointeur fin), curseur loupe et infobulle (`title`) au survol ; au toucher il reste visible (jamais de survol seul). Clic : feuille (composant à créer, par exemple dans `GuideFigure.tsx`, sur le modèle des feuilles existantes du site) : téléphone, plein écran, image à sa largeur réelle (défilement horizontal et pincement) ; tablette portrait, panneau centré de 92 vw, image à 1 280 px CSS, défilement horizontal ; tablette paysage, ordinateur et 1 440 px, même feuille centrée plafonnée à 1 280 px sur un scrim assombri ; fermeture par Échap, par ×, par clic hors de la feuille.
  - Mouvement : ressort critique, réponse 0,35 s, `transform-origin` sur la figure, interruptible ; `prefers-reduced-motion` : fondu de 200 ms ; `prefers-reduced-transparency` : scrim opaque (le motif existe déjà dans `src/app/globals.css:145`) ; `prefers-contrast: more` : liseré en `border-foreground/40`.
  - Libellés : nouvelle clé `guide.agrandirCapture` : fr « Agrandir la capture », zh-CN 「放大截图」 ; légende sous la feuille ouverte, pour le défilement : `guide.captureDefilement` fr « Capture à sa largeur réelle : on la fait défiler ou on la pince. », zh-CN 「截图保持原始宽度：可滑动或双指缩放。」 ; pour tablette/ordinateur `guide.captureFermerAide` fr « Échap, × ou clic hors de la feuille pour fermer · défilement horizontal », zh-CN 「按 Esc、点 × 或点击面板外关闭 · 可横向滚动」 (textes de la planche) ; le × réutilise la clé « Fermer » / 「关闭」 de `common.buttons.close` (`fr.json:30`, `zh-CN.json:30`, à confirmer). Les insérer dans le bloc `guide` (`fr.json:846`, `zh-CN.json:842`), à côté de `captures`.
  - Pas de nouvelle capture : même fichier `/guide/<id>.png`. Les 15 images font 1 280 px.
- Critères : sombre, ordinateur (610 px de capture dans une carte `#1c1c1e`) et tablette (figure d'environ 700 px CSS, échelle .55) : plus de bloc blanc éblouissant, texte de l'interface lisible une fois la feuille ouverte ; téléphone : figure d'environ 346 px CSS pour une source de 1 280 px (texte d'environ 3 px) lisible dans la feuille. Clair : aucun filtre, la capture claire se fond dans la carte claire. Bouton de 44 px visible au toucher sur les quatre dispositions et 1 440 px ; Échap ferme ; le focus revient au bouton. fr et 中文.
- Test : nouvelle vérification dans `tests/pages-en-grand-guide-equipes.spec.ts` (ou `tests/guide-b6.spec.ts` pour le haut de page) : sombre, `getComputedStyle(img).filter` contient `brightness`; clic sur « Agrandir la capture », feuille visible, image à `naturalWidth` réel, Échap ferme ; trois appareils au moins, les cinq pour les largeurs de panneau (92 vw tablette portrait, plafond 1 280 px ailleurs).
- Points de vigilance de la planche : la valeur du filtre (.85 ou .70) se juge à l'écran sur la vraie page ; aucun mouvement n'a été capturé (la feuille est dessinée d'après la description, l'éblouissement n'est pas recadré en tablette paysage) ; sur téléphone la lecture demande toujours un geste. Les captures dédiées (jeu téléphone et jeu sombre, C) ne valent que si eglise-5 A est fait : alors les faire d'un coup, c'est-à-dire en T5. La recadrage sur la zone annotée (B) est écartée.

### eglise-11 · Connexion : la marque et « Connexion » sont répétées
- Tranche : T1
- Décision : A, masquer le bouton « Connexion » sur `/login` et `/signup`, dans l'en-tête et dans la barre latérale (déployée et réduite).
- À faire :
  - `src/components/layout/Navbar.tsx:276-285` (`Link href="/login"` de l'en-tête, classe `connexion-visiteur`) : ne pas le rendre quand `usePathname()` est `/login` ou `/signup` (deux tests de chemin ; ne pas oublier les barres obliques finales : `startsWith("/login")` / `startsWith("/signup")`).
  - `src/components/layout/BarreLaterale.tsx:372-380` (`Link href="/login"`, classe `barre-connexion`) : même règle, pour la barre déployée (ordinateur, 1 440 px) et pour l'icône de la barre réduite (tablette paysage). « FR » et le thème restent.
  - Libellés : aucun, aucune clé.
  - Correction de la planche : elle cite `BarreLaterale.tsx:375-380` et `Navbar.tsx:272-283` ; les liens sont aux lignes 372-380 et 276-285.
- Critères : `/login` et `/signup`, aux quatre dispositions et 1 440 px, fr et 中文, clair et sombre : aucun lien d'en-tête ou de barre latérale ne mène à `/login`. Téléphone : l'en-tête montre le logo et le nom à gauche, « FR » à droite. Tablette paysage, ordinateur et 1 440 px (deux volets : la marque puis le formulaire) : seul le bouton de la barre latérale disparaît. Sur les autres pages, un visiteur voit toujours « Connexion ».
- Test : `tests/chargement.spec.ts` ou `tests/look-fondations.spec.ts` (déjà sur les quatre dispositions) ou une nouvelle vérification : visiteur non connecté, `/login` puis `/signup` : `getByRole("link", { name: "Connexion" })` hors du formulaire a `toHaveCount(0)` ; page d'accueil visiteur : présent. Chercher le test existant qui compte les liens de connexion (`grep -n "connexion-visiteur\|barre-connexion" tests/*.ts`) et l'adapter.
- Points de vigilance de la planche : la marque reste dite deux fois (en-tête et bandeau) : assumé, le logo gelé n'est pas touché (alternative « retirer le logo du bandeau » écartée). B (en-tête réduit à la langue et au thème) et C (pas de bandeau sur téléphone) non retenues ; le bouton de la barre latérale doit suivre la règle de A. `/signup` a déjà ses propres liens vers `/login` (`signup/page.tsx:71` et `:252`), donc le bouton d'en-tête y fait aussi doublon : la règle couvre `/signup`.

### eglise-13 · Connexion : trois styles de liens, formulaire frêle en grand écran
- Tranche : T1
- Décision : C, chaque lien à sa place : « Mot de passe oublié ? » sous le champ, « Créer un compte » seul appuyé sous le bouton, « ‹ Chants » en retour en haut.
- À faire :
  - `src/app/(auth)/login/page.tsx:112-127` (pile `mt-6 flex flex-col items-center gap-3` de trois liens) : supprimer la pile.
  - Même fichier, champ mot de passe (l. 91-102) : sous le champ, aligné à droite, le bouton « Mot de passe oublié ? » (`handleForgotPassword`, l. 49), 14 px, `--muted-foreground`, souligné, zone de 44 px (`min-h-11`).
  - Sous « Se connecter » (l. 118-120) : une seule ligne centrée, « Pas encore de compte ? » en `--muted-foreground` suivi du lien « Créer un compte » en `--foreground`, demi-gras, souligné, zone de 44 px. Remplacer la clé unique `login.signupLink` (`fr.json:162` « Pas encore de compte ? Créer un compte », `zh-CN.json:162`) par deux clés : `login.signupQuestion` fr « Pas encore de compte ? » / zh-CN 「还没有账号？」 et `login.signupAction` fr « Créer un compte » / zh-CN 「注册」. Retirer `login.signupLink` des deux fichiers une fois sans usage (`grep -rn "login.signupLink" src tests`).
  - En haut du formulaire, avant le `<h1>` (l. 78) : le composant `Retour` (`src/components/layout/EnTetePage.tsx:23-34`, R8) vers `/setlists` (l'adresse actuelle du lien, `login.backToSetlists`), libellé « Chants » / 「诗歌」. Remplacer `login.backToSetlists` (`fr.json:160` « ← Revenir aux chants » ; `zh-CN.json:160` 「← 返回歌曲列表」, qui ne dit pas le nom de l'onglet) : réutiliser la clé de l'onglet (`common.header.songs`, `fr.json:7` « Chants » ; vérifier la valeur zh-CN) plutôt qu'en créer une, puis retirer `login.backToSetlists`.
  - Grand écran (commun aux pistes de la planche) : `src/components/auth/EcranMarque.tsx:90` (`max-w-[380px]`, `large ? "max-w-[620px]"`) : conteneur de formulaire de 380 à 420 px dès `lg` (`lg:max-w-[420px]`), titre `login.heading` en 30 px (`lg:text-3xl lg:tracking-[-0.02em]`) ; téléphone et tablette portrait gardent leur largeur.
  - `/signup` doit suivre la même règle (non capturé de près dans la planche) : `src/app/(auth)/signup/page.tsx:248-254` (lien `signup.alreadyAccount` en bas, `text-center`) reste tel quel pour l'instant ; lui appliquer le retour « ‹ Chants » seulement si la planche d'inscription le demande, sinon le signaler à la relecture.
  - Correction de la planche : `login.backToSetlists` dit 「返回歌曲列表」 alors que l'onglet est 「诗歌」 : c'est le « au passage » que la nouvelle clé règle.
- Critères : `/login` aux quatre dispositions et 1 440 px, fr et 中文, clair et sombre : plus de pile de trois liens ; « Mot de passe oublié ? » sous le champ mot de passe à droite ; une seule ligne sous « Se connecter » avec « Créer un compte » en gras souligné ; « ‹ Chants » / 「‹ 诗歌」 en haut, même retour que partout. Grand écran : formulaire de 420 px dans sa moitié, titre de 30 px.
- Test : nouvelle vérification (par exemple `tests/connexion.spec.ts`, à créer, sur les quatre dispositions et 1 440 px, à ajouter à `SPECS_GRAND_ECRAN` de `playwright.config.ts`) : le lien de retour mène à `/setlists`, « Créer un compte » mène à `/signup`, `login.forgotPassword` est un bouton (clic sans courriel : message `login.resetNeedEmail`), largeur du conteneur de formulaire 420 px en grand. Vérifier qu'aucun test existant ne cherche « Revenir aux chants » ou `login.signupLink` (`grep -rn "Revenir aux chants\|Pas encore de compte" tests`).
- Points de vigilance de la planche : touche trois endroits du formulaire ; `/signup` doit suivre. Le titre à 30 px peut être repris par l'échelle B de T4 : si T4 passe avant, utiliser l'échelle de T4. Alternatives écartées : A (bouton à contour pleine largeur, « Créer un compte » pèserait autant que « Se connecter » pour le membre qui revient) et B (un seul style de lien).

### eglise-18 · Sommaire du guide : environ 810 px de haut sur téléphone
- Tranche : T1
- Décision : A, sommaire replié sur téléphone en une ligne `.raised` de 52 px, qui s'ouvre au toucher.
- À faire :
  - `src/app/guide/page.tsx:124-171` (`sommaire`, `<nav>` `raised rounded-2xl p-3`) : pour `disposition === "telephone"` uniquement, remplacer l'en-tête `<p>` (l. 133-135) par un bouton de 52 px de haut (`aria-expanded`, `aria-controls`) : icône liste, « Sur cette page (17) » / 「本页内容（17）」, chevron ⌄ à droite. Le nombre est `SECTIONS.length` (`page.tsx:62`), jamais écrit à la main : 17 avec le back-office ouvert, 14 coupé (évènements, scène et tâches des équipes retirés, `COUPEES`, l. 61). Au toucher, la liste actuelle (entrées de 44 px, `min-h-11`) s'ouvre en dessous ; choisir une entrée referme le bloc puis fait défiler vers la section (le `href="#key"` actuel suffit, ajouter la fermeture dans le `onClick`). Fermé par défaut.
  - Mouvement : hauteur et opacité en ressort critique, réponse 0,3 s, interruptible ; `prefers-reduced-motion` : fondu de 150 ms.
  - Tablette portrait (grille de deux colonnes ouverte d'office), tablette paysage, ordinateur et 1 440 px (colonne collante de 260 px) : inchangés, la règle ne vaut que pour `disposition === "telephone"`.
  - Libellés : nouvelle clé `guide.tocReplie` fr « Sur cette page ({{count}}) », zh-CN 「本页内容（{{count}}）」, dans le bloc `guide` (`fr.json:846-849` et `zh-CN.json:842-845`, à côté de `tocTitle`). `guide.tocTitle` reste pour les autres dispositions.
- Critères : téléphone (390 px, et 320 px), fr et 中文, clair et sombre : le sommaire replié fait 52 px de haut au lieu d'environ 810 px, la première section arrive au premier écran ; déplié, 17 entrées (14 sans back-office) de 44 px ; choisir une entrée ferme et fait défiler. Le libellé montre le bon nombre dans les deux modes du back-office. Autres dispositions : rien ne change.
- Test : adapter `tests/pages-en-grand-guide-equipes.spec.ts` (cinq projets) : téléphone, hauteur du `nav` du sommaire ≤ 60 px fermé, le bouton annonce `aria-expanded="false"`, nombre dans le libellé = nombre de liens une fois ouvert ; tablette et grand : le sommaire reste ouvert. Test à part avec le back-office coupé (`tests/back-office-coupe.spec.ts`, second serveur) : le libellé dit 14.
- Points de vigilance de la planche : la barre d'onglets est incrustée par la capture pleine page et masque une ou deux entrées du sommaire sur `telephone/guide-fr-clair.png` : ne pas en déduire de défaut de l'application. Le nombre d'entrées a été corrigé trois fois (15, 16, puis 17) : toujours `SECTIONS.length`. Alternatives écartées : B (pastilles défilantes collées en haut, demande `usePartieLue` aujourd'hui coupé sur téléphone) et C (feuille du bas, composant le plus lourd).

### eglise-9 · Titres de carte à deux tailles dans la fiche d'évènement
- Tranche : T1
- Décision : correction recommandée du tableau : « Inscriptions » en 16 px demi-gras comme « Tâches », étiquettes Date / Heure / Lieu en 13 px, et retrait du sous-panneau gris d'« Inscriptions ».
- À faire :
  - `src/app/evenements/[id]/Inscriptions.tsx:233` (`PanneauInscriptions`, `<section ... className="space-y-3 rounded-xl bg-secondary/60 p-4">`) : retirer `rounded-xl bg-secondary/60 p-4` (fin de la « carte dans la carte », § 3 de l'audit) ; la section devient le titre de sa carte, qui est déjà `raised` (`EvenementClient.tsx:312` en grand ; `:347` en un volet).
  - Même fichier, l. 236 : le titre `<h3 className="text-sm font-semibold ...">` passe à `text-base font-semibold`, pareil que `TachesEvenement.tsx:80` (`text-base font-semibold`, 16 px). Libellé inchangé (`evenements.panneauInscriptions` : fr « Inscriptions » `fr.json:2355`, zh-CN 「报名」 `zh-CN.json:2323`).
  - `src/app/evenements/EvenementCard.tsx:109` (`block text-xs text-muted-foreground`, étiquettes Date / Heure / Lieu de `InfosEvenement titrees`) : `text-xs` (12 px) passe à `text-[13px]`.
  - Le formulaire d'inscription du membre (`Inscriptions.tsx:143`, `rounded-xl bg-secondary/60 p-4`) est un autre sous-panneau : non cité par la planche, ne pas y toucher ici (le signaler à la relecture).
- Critères : fiche d'évènement d'un responsable, téléphone, tablette portrait, tablette paysage, ordinateur et 1 440 px : « Inscriptions » et « Tâches » ont la même taille (16 px) et la même graisse ; plus de fond gris sous « Inscriptions » ; étiquettes Date / Heure / Lieu à 13 px. fr et 中文, clair et sombre.
- Test : adapter `tests/agencement-v18-t7.spec.ts` ou `tests/taches-evenements.spec.ts` : `getComputedStyle` du `h3` « Inscriptions » (`fontSize === "16px"`) égal à celui du `h3` « Tâches » ; `getByTestId("etat-inscriptions")` voisin sans fond de section.
- Points de vigilance de la planche : aucun. Voir T4 si l'échelle B redéfinit le 13 px.

### eglise-15 · Pas de thème pour un visiteur sur téléphone
- Tranche : T1
- Décision : assumer le réglage du système et l'écrire dans la section « Compte, langue et thème » du guide (la lune sur `/login` est une option qui dépend d'eglise-11, non retenue).
- À faire :
  - `src/locales/fr.json` (bloc `guide.sections.account`, l. 957-965) : ajouter à `points` une ligne, formulation indicative à valider : « Le thème suit le réglage de ton appareil tant que tu n'es pas connecté. » ; zh-CN (`zh-CN.json:953-961`) : 「未登录时，主题会跟随你设备的设置。」. Insérer en texte, avant la dernière puce.
  - Aucun code. Le rond lune de 40 px sur `/login` (option de la planche) n'est pas fait.
- Critères : section du guide « Compte, langue et thème » / 「账号、语言与主题」 : la nouvelle puce s'affiche, en français et en 中文, sur les quatre dispositions et 1 440 px.
- Test : `tests/guide-b6.spec.ts` ou `tests/pages-en-grand-guide-equipes.spec.ts` : la puce est présente dans la section `#account`, fr et zh-CN.
- Points de vigilance de la planche : la formulation est « indicative, à valider » avant de figer.

### eglise-16 · Nom du site en chinois à deux écritures
- Tranche : T1
- Décision : 「GCC 敬拜」 partout, pendant exact de « GCC Louange ».
- À faire :
  - `src/locales/zh-CN.json:151` (`login.title`, 「GCC 敬拜诗歌」) → 「GCC 敬拜」 ; `:189` (`setlists.list.title`, 「GCC 敬拜诗歌」) → 「GCC 敬拜」 ; `:795` (`signup.subtitle`, 「GCC敬拜——仅限教会成员」) → 「GCC 敬拜——仅限教会成员」 (espace ajouté entre « GCC » et « 敬拜 »). `common.header.title` (`zh-CN.json:6`) est déjà 「GCC 敬拜」. Vérifier d'autres écritures : `grep -n "GCC敬拜\|敬拜诗歌" src/locales/zh-CN.json src public/sw.js public/manifest*`.
  - `src/components/auth/EcranMarque.tsx:72` coupe `t("login.title")` sur l'espace (`[gcc, ...reste]`) pour colorer le second mot en `text-brand` : avec 「GCC 敬拜」 le résultat reste correct (« GCC » puis 「敬拜」). Ne rien changer au composant.
  - `src/app/manifest.ts` : vérifier que le nom de l'application ne dépend pas de ces clés (probablement non).
- Critères : écrans en 中文 : l'en-tête, la connexion, la liste des setlists et l'inscription disent tous 「GCC 敬拜」, avec l'espace ; le bandeau de la connexion (grand écran et un volet) montre « GCC » en encre et 「敬拜」 en couleur de marque. Aucune ligne ne déborde (nom plus court qu'avant). Français inchangé.
- Test : adapter les tests qui lisent le nom chinois : `grep -rn "敬拜诗歌\|GCC敬拜" tests` ; ajouter une assertion zh-CN dans le test de la connexion (voir eglise-13).
- Points de vigilance de la planche : alternative 「GCC 敬拜诗歌」 partout, écartée (plus explicite, plus long dans l'en-tête).

### eglise-17 · « Comment ça marche ? » centré alors que la liste est à gauche
- Tranche : T1
- Décision : retirer `text-center` et aligner le lien à gauche sur la colonne du contenu.
- À faire :
  - `src/components/guide/GuideLien.tsx:17` (`<p className="pt-2 text-center">`) : retirer `text-center` (le lien se cale à gauche sur la gouttière, comme le contenu de la liste).
  - Le composant sert quatre pages : `SongListClient.tsx:405`, `CalendrierClient.tsx:163`, `planning/page.tsx:238`, `setlists/page.tsx:605` ; vérifier à l'œil chacune (le lien se pose dans le conteneur de la liste, pas hors colonne). Si l'une l'affiche hors de la gouttière, l'y rentrer.
  - Pas de clé de langue (`guide.commentCaMarche`, fr « Comment ça marche ? » `fr.json:1121`, zh-CN 「如何使用？」 `zh-CN.json:1117`).
- Critères : sur Chants, Setlists, Planning et Évènements, le lien est aligné à gauche sur la même gouttière que les cartes/lignes, aux quatre dispositions et 1 440 px, fr et 中文. Sur Évènements téléphone, il vient après la pilule d'eglise-1 (24 px d'écart).
- Test : vérification dans `tests/pages-en-grand-evenements.spec.ts` (et l'équivalent Chants) : `boundingBox().x` du lien = `x` de la première carte (tolérance 1 px).
- Points de vigilance de la planche : alternative écartée, centrer le lien sous la colonne qui le porte.

---

## T2 · recette de surface

### eglise-3 · En clair, les cartes de l'évènement sont invisibles
- Tranche : T2
- Décision : A, `bg-card` remplacé par `.raised` sur les trois cartes (liste, gestion, fiche).
- À faire :
  - `src/app/evenements/EvenementCard.tsx:194` (`EvenementCarte`, `className="block space-y-4 rounded-2xl bg-card p-4 ..."`) : `bg-card` devient `raised`.
  - `src/app/evenements/[id]/EvenementClient.tsx:347` (`data-testid="gestion-carte"`) et `:355` (`data-testid="fiche-carte"`), branche un volet : `bg-card` devient `raised`. Rayon 16 px (`rounded-2xl`) et remplissage 16 px (`p-4`) inchangés. Les trois cartes occupent la largeur de la colonne (`max-w-2xl`), comme « Tâches » (`TachesEvenement.tsx:78`, déjà `raised`) : leurs bords tombent au même endroit.
  - En clair : fond `--raised` (blanc) et ombre `--shadow-raised` (`globals.css:213-214`) ; en sombre : `#1c1c1e` avec liseré de 1 px (`globals.css:272-273`) : déjà fourni par `.raised`.
  - La recette de T2 (fonds de groupe gris `#f2f2f7`, groupes blancs sans ombre) redéfinit `.raised` d'un coup : cette entrée ne fait que mettre les trois cartes sur la classe, T2 règle l'ombre. Ne pas écrire d'ombre propre à ces cartes.
  - Pas de clé de langue.
  - Correction de la planche : elle cite `EvenementCard.tsx:194`, `EvenementClient.tsx:347` et `:355` ; les trois sont exacts. Hors périmètre cité : `EvenementCard.tsx:230` et `:254` (lignes d'agenda en grand et `EntreeSheetCarte`, `bg-card`) sont sur le fond de la liste en grand et ne sont pas dans le constat : à regarder en T2.
- Critères : liste et fiche d'évènement, téléphone et tablette portrait (les dispositions où le défaut existe), fr et 中文 : en clair, les trois cartes ont une forme visible ; « Novembre 2026 » et le contenu de la carte ne divergent plus de 32 px à gauche ; la carte « Tâches » et celles du dessus ont la même largeur. En sombre : inchangé (la carte avait déjà un fond). Tablette paysage, ordinateur et 1 440 px : déjà `raised`, ne bougent pas.
- Test : `tests/agencement-v18-t7.spec.ts` (barre-fiche, gestion-carte, fiche-carte) : `getComputedStyle(carte).boxShadow !== "none"` en clair, et `boundingBox().x/width` de `fiche-carte` = ceux de `taches-carte`. Ajouter ce test à `tests/pages-en-grand-evenements.spec.ts` pour couvrir les cinq projets.
- Points de vigilance de la planche : ajoute une ombre à des éléments qui ne flottent pas, alors que le chantier 2 veut la réserver à ce qui flotte : acceptée, une seule classe à retoucher (70 usages de `.raised`). Une liste à plusieurs évènements ou avec de vraies images n'a pas été capturée (c'est ce qui départage les pistes A et B).

### eglise-12 · Connexion : le bandeau en un volet finit sur un bord net
- Tranche : T2
- Décision : C, retirer fond et halos du bandeau en un volet (sous `lg`).
- À faire :
  - `src/app/globals.css:762-773` (`.panneau-marque` et `.dark .panneau-marque` : deux `radial-gradient` rouge/bleu plus `hsl(var(--secondary) / 0.5)`) : sous `lg` (< 1 024 px), pas de fond ni de halo ; logo et nom directement sur `--background`. Conserver tel quel le fond à deux volets (≥ 1 024 px) : la coupe verticale entre marque et formulaire est la frontière voulue. Écrire la règle dans une requête `@media (max-width: 1023px)` qui remet `background: none` (ou l'inverse : les dégradés dans `@media (min-width: 1024px)`).
  - `src/components/auth/EcranMarque.tsx:78` (`<div data-testid="panneau-marque" className="panneau-marque flex ... px-4 py-8 text-center sm:py-12 ...">`) : espacement vertical réduit de `py-8` à `py-6` sur téléphone (`py-6 sm:py-12`) ; pas de filet.
  - Pas de clé de langue.
- Critères : `/login` et `/signup` en tablette portrait (820 px) et téléphone (390 px), clair et sombre : plus de bord net sous « Réservé aux membres de l'église », plus de halo bleu coupé à pleine force ; logo (pastille blanche, gelé) toujours lisible, y compris sur le noir en sombre. Tablette paysage, ordinateur et 1 440 px : bandeau gauche identique à aujourd'hui. fr et 中文.
- Test : la nouvelle spec de connexion (voir eglise-13) : sous 1 024 px, `getComputedStyle(panneau-marque).backgroundImage === "none"` ; à partir de 1 024 px, `!== "none"`. Regarder à l'œil la pastille blanche du logo sur noir (capture sombre).
- Points de vigilance de la planche : zone gelée, le logo en pastille blanche, `serviceColors`, accords et sections restent tels quels ; seuls le fond et les halos du bandeau changent ; la pastille blanche se voit déjà sur noir dans l'en-tête sombre. Le premier écran perd sa seule touche de couleur hors logo : assumé. Si Timothée répond non à la question « halos » (§ 5 de l'audit), repli sur A : le halo bleu monte (`85% 88%` à `85% 60%`, ellipse `75% 55%` à `75% 45%`), sous `lg` seulement. B (masque `mask-image` sur un pseudo-élément) écartée.

---

## T4 · typographie et largeurs

### eglise-19 · Astuces du guide en 12 px
- Tranche : T4
- Décision : astuce à la taille du corps (15 px), `leading-relaxed`, icône de 16 px, en `--foreground` à 80 %, distinguée par son seul fond.
- À faire :
  - `src/app/guide/page.tsx:257-264` (`<div className="flex gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">`, icône `Lightbulb h-3.5 w-3.5`) : `text-xs` devient `text-[15px]` (taille des puces, l. 245 : `text-[15px]`), `text-muted-foreground` devient `text-foreground/80`, `Lightbulb` passe à `h-4 w-4` (16 px).
  - Pas de clé de langue (`guide.sections.<clé>.tip`).
  - Si l'échelle B de T4 fixe une autre taille de corps pour le guide, la prendre à la place de 15 px (l'astuce suit le corps).
- Critères : toutes les sections du guide qui ont une astuce (par exemple « Tu ne vois ces outils que si tu en as les droits. »), aux quatre dispositions et 1 440 px, fr et 中文, clair et sombre : l'astuce a la taille du texte qu'elle complète, contraste lisible sur le fond `--secondary`/60.
- Test : `tests/pages-en-grand-guide-equipes.spec.ts` : `getComputedStyle` de l'astuce (`fontSize`) égal à celui d'une puce de la même section.
- Points de vigilance de la planche : aucun.

---

## T5 · contenu chinois

### eglise-5 · Les captures du guide restent en français dans l'interface 中文
- Tranche : T5
- Décision : A, un jeu de captures en 中文 (15 images), avec ses coordonnées d'annotation. Si Timothée le remet à plus tard (question 5 de l'audit), faire C (pastilles bilingues) en attendant, pas B (figures masquées).
- À faire :
  - `tests/guide-captures.spec.ts:31` (`locale: "fr-FR"`) et `:38` (`SORTIE = "public/guide"`) : ajouter une variable de langue (par exemple `GUIDE_LANGUE=zh-CN`) qui passe `locale: "zh-CN"`, écrit dans `public/guide/zh/` et produit `scripts/guide/mesures-zh.json` (l. 324 écrit aujourd'hui `scripts/guide/mesures.json`). Le script mesure déjà lui-même les cibles ; les 15 captures actuelles (`public/guide/*.png`) sont refaites. Relancer après T2, T3 et T4 : les captures montrent l'interface, qui change dans ces tranches.
  - `src/components/guide/GuideFigure.tsx:119-120` : en 中文, `src` = `/guide/zh/${figure.id}.png` ; en français, inchangé.
  - `src/lib/guide/figures.ts` (13 figures, `FIGURES`) : coordonnées par langue (les libellés chinois, plus courts, déplacent les cibles) : un objet `zh` à côté des annotations françaises, repris des mesures de `mesures-zh.json`. Pas de nouveau libellé : `guide.captures.<id>.labels.*` existent déjà en chinois (「诗歌标签」, 「搜索」, 「个性化」).
  - `public/sw.js` : les images du guide ne sont pas précachées à l'installation ; rien à ajouter. Vérifier le plafond du cache (250 entrées pour `/jianpu/`, 300 pour `/_next/static`) : `/guide/` n'est pas concerné.
  - eglise-6 B et C : si les captures sombres dédiées sont voulues, faire le jeu sombre en même temps (la planche le dit : « mieux vaut faire les deux d'un coup »), sinon le filtre CSS d'eglise-6 suffit.
  - Repli C (si T5 est reporté) : sous chaque pastille, le mot français visible dans l'image, en 12 px à 70 % d'opacité (11 px était sous le seuil de lisibilité), la pastille gardant son terme chinois en 12 px demi-gras ; une ligne sous la première figure, zh-CN seulement : 「截图为法文界面，标注中附有对应的法文。」 (clé à créer, `guide.captures.avertissementLangue`).
  - Important : il est écrit « 15 captures » dans la planche ; le dossier `public/guide/` en contient 15 fichiers PNG, `figures.ts` en déclare 13 `id` : relire la correspondance avant de lancer.
- Critères : guide en 中文, téléphone, tablette portrait, tablette paysage, ordinateur et 1 440 px, clair et sombre : chaque capture montre l'interface en chinois (「诗歌」, 「选择一首诗歌」), les cercles et pastilles sont sur leurs cibles chinoises, aucun mot français ne subsiste dans l'image. Le guide en français est inchangé.
- Test : `tests/guide-captures.spec.ts` (sans `GUIDE_CAPTURES=1` il ne fait rien) : exécuter le script en zh-CN et vérifier que chaque `id` de `FIGURES` a un PNG et une mesure dans `mesures-zh.json` (la spec lève déjà « capture manquante » en cas d'oubli, l. 322) ; une vérification de guide en zh-CN (`tests/pages-en-grand-guide-equipes.spec.ts`) : `src` de l'image contient `/guide/zh/`.
- Points de vigilance de la planche : deux jeux à refaire à chaque changement d'interface, 15 PNG de plus et des coordonnées à reporter ; quatre jeux de 15 images au maximum avec eglise-6 C. Pour cette raison, ne le faire qu'une fois T2 à T4 livrés. Poids : surveiller la taille de `public/guide/` (optimiseur : `scripts/guide/optimiser.py`).
