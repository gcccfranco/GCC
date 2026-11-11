# Spec — Les deux exemples de Timothée : vue Partitions d'une setlist et feuille « Modifier une équipe »

Demande AP (« le site devient le pupitre »). Planche validée : `docs/planches/planche-exemples-usage.html`, **piste A
« Pupitre »**, « Ok » de Timothée sur les onze questions (11/11/2026, nuit). Décisions recopiées de
`docs/spec-pupitre-musicien.md`, sections « Décisions de Timothée après le rapport d'usage » et « Décisions de
Timothée sur la planche des deux exemples » : elles ne se rouvrent pas ici. Constats d'origine :
`docs/audit-usage-2026-11-11.md`, « Les deux exemples de Timothée » (dimanche-13, chants-1, chants-2, chants-7,
bo-equipes-5).

**Aucune ligne de code avant un go par tranche** (« go pour la tranche N »). Chaque tranche se code par une session
orchestratrice neuve (CLAUDE.md, « Coder »), une tranche par appel de `/tranche`.

## 1. Objectif

En plein service, le musicien voit la musique dès qu'il regarde l'écran et ne remonte jamais pour trouver la suite.
Le responsable d'équipe ajoute, règle et retire un membre sans faire défiler pour enregistrer.

### Ce qui est décidé (rappel court)

| N° | Décision |
|----|----------|
| R2 | Les partitions prennent la largeur (règle du 07/11, « colonne alignée à gauche », rouverte pour elles). |
| R3 | Liste \| Partitions au toucher : le même glisser que le geste du doigt. |
| R4 | Mode louange : aucune animation. |
| P1 | Deux colonnes lues en rangées (Intro \| Couplet 1, puis Refrain \| Couplet 2). |
| P2 | Sommaire en vue Partitions (tablette couchée, ordinateur) : rail de numéros qui s'ouvre au toucher ; ouvert en vue Liste. |
| P3 | Note de la setlist : une ligne en italique dans la barre du haut, dépliable. |
| P4 | Vue Liste : colonne d'environ 720 px, alignée sur le même bord gauche que les partitions. |
| P5 | Retirer un membre depuis ses réglages dépliés (« Retirer de l'équipe »), puis « Remettre » sur la ligne jusqu'à l'enregistrement ; plus de croix. |
| P6 | Feuille d'équipe en tablette debout : feuille de formulaire centrée de 560 px. |
| P7 | Colonne unique en tablette debout : taille de paroles actuelle. |
| P8 | Étiquettes de sections : « Couplet 1 » en semi-gras, même couleur gelée (`--sec-*`), au lieu des capitales espacées. |
| P9 | Deux colonnes à partir d'environ 1 360 px de fenêtre ; une colonne de 920 px à 1 280 px. |
| P10 | Réglages d'un membre : rôle, « Référent », « En essai », « Retirer de l'équipe » — **le code diffère, voir § 3**. |
| P11 | Téléphone : « Mode Louange » devient un bouton rond à icône seule (libellé pour les lecteurs d'écran). |

Acquis aussi sur la planche A : champ « Ajouter un membre » en tête de la feuille, une ligne repliée par membre,
« Annuler » et « Enregistrer » collés en bas, « en essai » visible sur la ligne ; une seule matière translucide
(celle des bandeaux collés), aucune action orange, `--primary` intouché.

### Critères de succès (mesurés par Playwright sur le site)

**Mesure** : position du haut de l'étiquette « Couplet 1 » du premier chant, en pourcentage de la hauteur de la
fenêtre, page en haut, vue Partitions ouverte. Setlist simulée : Hosanna (`hosanna.cho`) en premier, avec une note
(« Intro douce, enchaîner sans pause »). Le test fixe la taille de fenêtre de la planche dans le projet de la même
disposition (`page.setViewportSize`). **Tolérance proposée : +3 points** (la police réelle et les rangées réelles ne
sont pas celles de la maquette) ; une valeur plus basse est toujours acceptée.

| Disposition (projet) | Fenêtre | Aujourd'hui | Cible, aide affichée | Cible, aide déjà vue |
|---|---|---|---|---|
| Téléphone (`telephone`) | 390 × 844 | 70 % | ≤ 45 % (+3) | ≤ 36 % (+3) |
| Tablette debout (`tablette`) | 820 × 1 180 | 57 % | ≤ 33 % (+3) | ≤ 29 % (+3) |
| Tablette debout, 一切歌颂赞美 en texte, sans intro | 820 × 1 180 | — | ≤ 25 % (+3) | ≤ 21 % (+3) |
| Tablette couchée (`tablette-paysage`) | 1 080 × 810 | — | ≤ 35 % (+3) | plus bas |
| Ordinateur (`ordinateur`) | 1 280 × 720 | — | ≤ 39 % (+3) | plus bas |
| Ordinateur large (`ordinateur-1440`) | 1 440 × 900 | — | ≤ 24 % (+3) | plus bas |

**La cible de 40 % au téléphone n'est pas tenue par la maquette** quand la bulle d'aide de première visite est
affichée (45 %) ; elle l'est sans la bulle (36 %). La bulle ne s'affiche qu'une fois par appareil : on accepte 45 %
à la toute première ouverture.

**Largeurs** (mêmes fenêtres) :
- Tablette debout : la partition va jusqu'à la marge de droite (`--marge-page`) : plus de bande vide de 115 px.
- 1 280 × 720 : une colonne de 920 px (± 16), aucune ligne de paroles coupée sur deux lignes (Hosanna FR).
- 1 440 × 900 : deux colonnes de 528 px (± 16), gouttière de 24 px, lecture en rangées, aucune ligne de paroles
  coupée (Hosanna FR et le chant ZH en texte). Rien au-delà du plafond de lecture de 1 440 px, jamais de troisième
  colonne.
- Vue Liste : colonne de 720 px au plus, son bord gauche au pixel près sur celui des partitions.

**Feuille d'équipe** (équipe Louange simulée, neuf membres aux noms inventés) :
- Chaque ligne repliée mesure 52 px (± 2), avec ou sans rôle ; la ligne entière ouvre les réglages (cible ≥ 44 px
  de haut, toute la largeur).
- « Enregistrer » est visible sans défiler à l'ouverture sur les cinq projets, 1 280 × 720 compris ; au téléphone
  (390 × 844), le champ d'ajout, les neuf lignes et la barre tiennent sans défiler.
- Tablette debout : la feuille mesure 560 px de large, centrée.
- Aucun bouton croix sur les lignes ; « Retirer de l'équipe » dans les réglages ; un membre retiré reste sur sa
  ligne, pâli, avec « Remettre » (dessin 32 px, zone de toucher 44 px) ; « Enregistrer » le retire pour de bon,
  « Annuler » ou « Remettre » le garde.
- « en essai » se lit sur la ligne repliée.

## 2. Hors champ

- Le mode louange : aucun de ses fichiers n'est touché, aucune animation n'y est ajoutée. Retirer celles qui
  existent (décision R4, « même pour passer au chant suivant ») appartient au chantier du pupitre
  (`docs/spec-pupitre-musicien.md`), pas à ce lot.
- Les autres formulaires du site ne prennent pas la barre collée ici ; chacun plus tard, en retouche.
- Zones gelées (`docs/audit-ui-apple-design.md` § 2) : vérifié, la spec n'y touche pas. Couleurs des sections, des
  accords et du 简谱 inchangées (P8 ne change que la casse, l'interlettrage et la graisse) ; l'intérieur du calque
  简谱 (`JianpuSheet`, calques certifiés) n'est jamais coupé ni modifié ; l'export PDF et l'impression gardent leur
  rendu actuel (les deux colonnes et la barre compacte sont `print:` neutralisées) ; couleurs de `serviceColors.ts`
  (« Mode Louange » garde la couleur de son service) ; logo.

## 3. Décision 10 vérifiée dans le code : les réglages d'un membre

La maquette dessine quatre réglages (rôle, « Référent », « En essai », « Retirer de l'équipe »). Le code
(`MembreOrganigramme`, `src/components/equipes/OrganigrammeLouange.tsx` ; `EditionEquipe`,
`src/app/equipes/EquipesClient.tsx`, back-office ouvert) en offre d'autres :

**Équipe Louange (et Régie), ligne dépliée :**
- **Mention** : champ de texte libre (libellé « Mention », 备注). C'est ce que la maquette appelle « rôle ».
  Seulement pour qui tient toute l'équipe.
- **« en essai »** : une pastille, seulement pour qui tient toute l'équipe.
- **Sous-équipes** (Louange seulement) : pastilles, chacune selon les droits de qui modifie.
- **Référent : en lecture seule.** Depuis le lot RS, on ne coche plus « Référent » ici : la ligne l'affiche
  (« Référent·e de Louange », « Référent·e des Musiciens »…) et un administrateur a le lien « Gérer les
  responsabilités » vers `/back-office/equipes/responsabilites`.
- **« Où il sert »** : pastilles des lieux.
- **« Ce qu'il joue »** : pastilles des instruments, si le membre est dans les Musiciens.
- **« Ce que ça lui ouvre »** : encadré en lecture seule.
- **Retrait** : aujourd'hui une croix sur la ligne. Un référent de sous-équipe ne retire le membre que de **sa**
  sous-équipe ; la ligne ne disparaît que s'il n'en reste aucune autre.

**Autres équipes** (ligne simple) : Mention, pastilles EDD (équipe EDD), Référent en lecture seule, « en essai » en
case à cocher, croix de retrait.

**Ce que la spec retient, sauf avis contraire de Timothée (question Q1)** : on garde tous les réglages existants, à
leur place et sous leurs libellés actuels (« Mention » reste « Mention », « Référent » reste en lecture seule) ; on
change seulement la ligne repliée (52 px, « en essai » visible, plus de croix) et on ajoute « Retirer de l'équipe »
en bas des réglages. Pour un référent de sous-équipe, le bouton dit « Retirer de ma sous-équipe » et garde le
comportement actuel.

## 4. Ce que la planche n'a pas dessiné : cadrage

**简谱 (image du scan avec calque)**
- Un chant affiché en 简谱 est une image entière : il ne passe **jamais** en deux colonnes. En mode deux colonnes,
  il occupe une rangée entière.
- Largeur : la largeur de la zone de partition, **plafonnée à 920 px** (la largeur d'une colonne unique), alignée à
  gauche. Au-delà, l'image grandirait jusqu'à ~1 080 px à 1 440 et ferait défiler davantage (question Q3).
- Tablette debout : l'image prend la nouvelle largeur (≈ 770 px au lieu de 672) ; le calque suit l'image comme
  aujourd'hui (`JianpuSheet` n'est pas modifié, seule la largeur de son conteneur change).
- Test : 一切歌颂赞美 (scan `public/jianpu/一切歌颂赞美-p1.webp`) en 简谱, sur les cinq projets : l'image et son calque
  ont la même largeur, rien ne déborde, l'image n'est jamais à côté d'une autre section.

**Mode sombre**
- La matière des bandeaux collés est celle qui existe déjà (`material-chrome`, `FondDeBarre`, déjà déclinée en
  sombre) : **aucun jeton nouveau**.
- Le membre retiré « pâlit » par l'opacité du nom et de son résumé seulement ; « Remettre » garde son contraste
  plein. Contraste du nom pâli ≥ 3:1 en clair et en sombre.
- Captures en sombre : téléphone et 1 440 px pour la vue Partitions ; téléphone pour la feuille d'équipe.

**Mouvement**
- Liste | Partitions au toucher : le même glissement que le geste du doigt, en réutilisant l'animation de
  `useSwipeViews` (`src/hooks/useSwipeViews.ts`), pas une seconde animation. Interrompu par un toucher.
- En-tête déplié (toucher sur le titre) : au défilement, il se replie en suivant le doigt 1:1, sans durée fixe.
  La barre compacte s'escamote comme la barre d'outils aujourd'hui.
- Rail du sommaire : il s'ouvre en panneau par-dessus la partition, avec un ressort sans rebond (≈ 0,35 s),
  interruptible ; il se ferme par un toucher en dehors ou par Échap.
- Feuille d'équipe : monte comme les feuilles vaul aujourd'hui ; une ligne de membre s'ouvre en hauteur
  (≈ 0,3 s) ; un membre retiré pâlit.
- `prefers-reduced-motion: reduce` : tous ces mouvements deviennent des fondus de 150 ms ; le suivi 1:1 de l'en-tête
  devient un changement direct.
- Mode louange : rien.

**Libellés nouveaux (FR · 中文)** — clés à placer près de leurs voisines dans `fr.json` et `zh-CN.json` ;
l'executant vérifie le vocabulaire déjà employé (歌单, 目录…) et s'y aligne.

| Où | FR | 中文 |
|---|---|---|
| Titre de la feuille | « {{equipe}}, {{n}} membres » (« 1 membre ») | 「{{equipe}}，{{n}} 人」 |
| Réglages | « Retirer de l'équipe » | 移出团队 |
| Réglages, référent de sous-équipe | « Retirer de ma sous-équipe » | 移出我的小组 |
| Ligne retirée | « Remettre » (lecteur d'écran : « Remettre {{nom}} ») | 恢复（「恢复{{nom}}」） |
| Ligne retirée, lecteur d'écran | « {{nom}}, retiré à l'enregistrement » | 「{{nom}}，保存后移出」 |
| Rail | « Ouvrir le sommaire » · « Fermer le sommaire » | 展开目录 · 收起目录 |
| Titre de la barre compacte | « Afficher les détails de la setlist » | 显示歌单详情 |
| Bouton rond au téléphone | libellé actuel de « Mode Louange », en `aria-label` | idem |

## 5. Tranches

Sept tranches, une par `/tranche`. Chacune : `npx tsc --noEmit`, `npm run lint`, Playwright sur les trois appareils
(et les cinq projets quand la spec est dans `SPECS_GRAND_ECRAN`), un chant FR (Hosanna) et un chant ZH
(一切歌颂赞美), regard à l'œil sur les quatre dispositions plus 1 440 px pour la vue Partitions. Les nouvelles
specs d'agencement s'ajoutent à `SPECS_GRAND_ECRAN` dès leur création. Les tests reprennent `tests/helpers/fakeSession.ts`
et `baseSimulee.ts` ; noms de membres inventés pour ces tests. Avant d'écrire, l'executant cherche les tests qui
visent ce qui change (`equipes.retirer`, la croix, `max-w-2xl`, `BasculeVues`, `uppercase` des étiquettes) et les
met à jour.

### T1 — Les partitions prennent la largeur (téléphone, tablette debout) ; étiquettes de sections

- Fichiers : `src/app/setlists/[id]/SetlistDetailClient.tsx` (conteneur `max-w-2xl` du volet unique),
  `src/app/setlists/[id]/_components/PartitionView.tsx` (`max-w-[var(--colonne-partition,42rem)]`),
  `src/app/setlists/[id]/_components/ListView.tsx` (vue Liste à 720 px, même bord gauche), `src/components/song/SongView.tsx`
  (étiquette de section : `font-semibold`, ni capitales ni interlettrage, même couleur `--sec-c`).
- P8 change l'étiquette partout où `SectionView` la dessine (page chant comprise) : c'est voulu, une seule écriture
  des sections sur le site.
- Critères : bande vide de droite supprimée en tablette debout ; taille des paroles inchangée (P7) ; étiquette lue
  « Couplet 1 », couleur calculée identique à avant.
- Tests : nouvelle `tests/pupitre-partitions.spec.ts` (largeurs, étiquettes), dans `SPECS_GRAND_ECRAN`.

### T2 — Barre compacte en vue Partitions (téléphone, tablette debout)

- Fichiers : `SetlistDetailClient.tsx` (en-tête de la setlist replié en vue Partitions ; vue Liste inchangée),
  `BasculeVues.tsx` (dans la barre d'outils au téléphone), `src/components/accords/AccordsProvider.tsx` (bulle d'aide
  posée dans le flux, entre les pastilles et la première section, et non plus par-dessus les paroles).
- Contenu de la barre : titre de la setlist (17 px semi-gras, 15 px au téléphone, interlettrage −0,01 em), date ;
  sous lui, la note en une ligne en italique, tronquée (P3). Un toucher sur le titre déplie tout l'en-tête
  (catégorie, présidence, droits, « Présentation », note entière) ; `aria-expanded`.
- Téléphone : « Mode Louange » en bouton rond à icône seule, 44 px, couleur de son service, `aria-label` (P11).
- Critères : les pourcentages du § 1 pour téléphone et tablette debout (FR et ZH), aide affichée et aide déjà vue.
- Tests : `pupitre-partitions.spec.ts` (mesure du couplet 1, dépli de l'en-tête au clavier et au toucher, bouton rond
  annoncé par son nom).

### T3 — Grand écran : rail du sommaire et colonne de 920 px (tablette couchée, ordinateur)

- Q2 tranchée : pas de bascule Liste | Partitions en deux volets ; le rail ouvert sert de liste.
- Fichiers : `SetlistDetailClient.tsx` (branche `deuxVolets`, en-tête collé, `--colonne-partition`),
  `_components/Sommaire.tsx` (rail de numéros de 56 px, panneau par-dessus au toucher), barre compacte de T2
  étendue aux deux volets.
- Critères : partition de 892 px en tablette couchée, 920 px à 1 280 px, sans ligne coupée ; couplet 1 aux
  pourcentages du § 1 ; le rail se lit au clavier (Tab, Entrée, Échap) et chaque numéro a le nom de son chant.
- Tests : `pupitre-partitions.spec.ts` (cinq projets).

### T4 — Deux colonnes en rangées et 简谱 (ordinateur large)

- Fichiers : `PartitionView.tsx` (grille de sections à deux colonnes, gouttière 24 px, chaque cadre à sa hauteur,
  ordre du DOM = ordre du chant, donc lecture en rangées ; scan 简谱 sur une rangée entière, plafonné à 920 px).
- Seuil : il suit la **largeur de la zone de partition** (deux colonnes dès qu'elle atteint ≈ 1 000 px, soit deux
  lignes de 487 px et la gouttière) par une requête de conteneur, et non la largeur de la fenêtre : cela donne
  ≈ 1 360 px de fenêtre avec la barre latérale dépliée (P9). Barre latérale réduite, le seuil arrive plus tôt ; les
  lignes ne sont toujours pas coupées.
- Impression : une colonne, comme aujourd'hui.
- Critères : § 1, 1 440 × 900 ; un chant 简谱 n'est jamais à côté d'une autre section ; ordre de lecture au lecteur
  d'écran inchangé.
- Tests : `pupitre-partitions.spec.ts` ; regard en clair et en sombre à 1 440.

### T5 — Le mouvement de la vue Partitions

- Fichiers : `BasculeVues.tsx` et `src/hooks/useSwipeViews.ts` (le toucher sur Liste | Partitions joue le
  glissement du doigt), `SetlistDetailClient.tsx` (repli 1:1 de l'en-tête déplié), `Sommaire.tsx` (ressort du rail).
- Critères : § 4 « Mouvement » ; sous `prefers-reduced-motion`, fondus de 150 ms ; aucun fichier du mode louange
  modifié.
- Tests : `pupitre-partitions.spec.ts` (le toucher déclenche le même état final que le geste ; `reducedMotion:
  "reduce"` donne un fondu ; pas de décalage de mise en page mesurable).

### T6 — Feuille d'équipe : forme, champ d'ajout en tête, barre collée

- Fichiers : `src/components/ui/drawer.tsx` (variante « feuille de formulaire » : centrée, 560 px, pied collé avec
  la zone sûre), `src/app/equipes/EquipesClient.tsx` (`FeuilleEquipe` : titre avec le nombre de membres ; champ
  « Ajouter un membre » et ses résultats en tête ; message d'erreur et « Réessayer » juste au-dessus de la barre ;
  « Annuler » et « Enregistrer » dans la barre collée).
- Dispositions : téléphone, feuille du bas actuelle avec barre collée ; tablette debout, feuille de formulaire
  centrée de 560 px (P6) ; tablette couchée et ordinateur, panneau de droite de 420 px actuel, avec barre collée.
- Critères : § 1 « Feuille d'équipe », sauf la hauteur des lignes (T7).
- Tests : nouvelle `tests/equipes-feuille.spec.ts`, dans `SPECS_GRAND_ECRAN` ; mise à jour d'`equipes-agencement.spec.ts`
  si besoin. Libellés FR et 中文.

### T7 — Feuille d'équipe : les lignes et le retrait

- Fichiers : `src/components/equipes/OrganigrammeLouange.tsx` (`MembreOrganigramme` : ligne d'une hauteur, toute
  touchable, « en essai » visible, plus de croix, « Retirer de l'équipe » en bas des réglages, état retiré avec
  « Remettre »), `EquipesClient.tsx` (`EditionEquipe` : les retraits restent dans le brouillon, marqués, jusqu'à
  « Enregistrer » ; la ligne simple des autres équipes alignée sur la même forme).
- Comportement : « Remettre » rend la ligne telle qu'elle était avant le retrait, y compris pour un retrait partiel
  d'un référent de sous-équipe ; « Annuler » abandonne tout ; à l'enregistrement, seuls les membres retirés
  disparaissent (même calcul `uidsAChanger` qu'aujourd'hui).
- Critères : § 1 « Feuille d'équipe » ; § 3 ; `aria-expanded` sur la ligne ; état retiré annoncé.
- Tests : `equipes-feuille.spec.ts` (retirer puis remettre, retirer puis enregistrer, retrait partiel d'un référent
  de sous-équipe), mise à jour des tests qui cliquaient la croix. Clair et sombre.

## 6. Questions

**Réponse de Timothée (11/11/2026) : « Ok pour les trois propositions ».** Q1 : réglages actuels gardés tels quels,
« Retirer de l'équipe » ajouté en bas. Q2 : pas de bascule Liste | Partitions en deux volets ; le rail ouvert sert de
liste. Q3 : 简谱 plafonné à 920 px. Plus aucune tranche bloquée par une question.

- **Q1 (tranchée)** — Réglages d'un membre : le code n'a pas de « rôle » mais un champ libre « Mention », et
  « Référent » ne se coche plus dans cette feuille (il se change dans Responsabilités). Proposition : garder tous
  les réglages actuels tels quels et seulement ajouter « Retirer de l'équipe » en bas. D'accord ?
- **Q2 (tranchée)** — Sur tablette couchée et ordinateur, le site n'a aujourd'hui **pas** de bascule Liste |
  Partitions (sommaire à gauche, partitions à droite, toujours) ; la maquette en dessine une. Proposition : ne pas
  l'ajouter ; le rail de numéros, une fois ouvert, joue le rôle de la liste. Ou faut-il ajouter la bascule ?
- **Q3 (tranchée)** — 简谱 sur grand écran : plafonner l'image à 920 px (proposition) ou la laisser
  prendre toute la largeur jusqu'à ~1 080 px ?

## 7. Avancement

- 11/11/2026 : spec écrite d'après la planche validée et le code (décision 10 vérifiée : écart noté, Q1). Sept
  tranches ; T1, T2, T6 et T5 (sauf le ressort du rail, qui suit T3) peuvent partir sans réponse aux questions. En attente : « go pour la tranche 1 ? ».
- 11/11/2026 : go de Timothée pour T1, lancée dans une session orchestratrice. Réponse « Ok pour les trois
  propositions » : Q1, Q2 et Q3 tranchées (§ 6).
