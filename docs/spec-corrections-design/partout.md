# Annexe · Corrections partout

Source : planche `docs/planches/planche-corrections-partout.html` (03/11/2026) ; décisions : recommandations (Timothée, 03/11/2026, « comme recommandé pour tout »). Audit d'origine : `docs/audit-design-2026-11-02.md`. Rien n'est codé ; chaque tranche attend son go (CLAUDE.md, « Go »).

Le groupe « Partout (transverse) » compte 2 constats propres (`chants-1`, `chants-7`) et quatre volets qui touchent tous les écrans (surface, contrôles, typographie et largeurs, questions Q1 à Q3). La rubrique « Finitions » de la planche est vide : aucun autre constat.

**Numérotation des tranches.** Cette annexe suit l'ordre de livraison validé par Timothée : T1 corrections immédiates · T2 recette de surface · T3 contrôles · T4 typographie et largeurs · T5 contenu chinois. La planche numérotait six tranches (T1 corrections, T2 halos, T3 surface, T4 contrôles, T5 typographie, T6 chinois) avec « T2 rejoint T1 » : les halos sont donc dans T1 ici, et T3 à T6 de la planche deviennent T2 à T5. Les sous-tranches de la planche (T3a/b, T4a/b/c, T5a/b) deviennent T2a/b, T3a/b/c, T4a/b.

## Récapitulatif

| id | titre | tranche | effort |
|---|---|---|---|
| chants-1 | Sélecteur d'espace qui déborde (« Back-Office » coupé) | T1 | Petit |
| chants-7 | Même icône pour Musiciens et Chants en barre réduite | T1 | Petit |
| partout-q1 | Titres de chants : casse normale sur la page, capitales en mode louange | T1 | Petit |
| partout-q2 | Halos : seulement ceux qui portent une couleur | T1 | Petit |
| partout-servir | « Mes services » : une seule traduction chinoise (我的服事) | T1 | Petit |
| partout-surface | Recette de surface : fond de groupe (piste C) | T2 (T2a, T2b) | Moyen à gros |
| partout-controles | Contrôles de choix : jeu B (rail, pilule, menu) | T3 (T3a, T3b, T3c) | Moyen |
| partout-zones-tactiles | Zones tactiles du rail et des pilules | T3 | Petit |
| partout-echelle | Échelle de texte B (xs à 12 / 16) | T4 (T4a) | Mécanique, ≈ 80 fichiers |
| partout-plancher | Plancher : 12 px partout, 13 px pour le gris à partir de 1 024 px | T4 (T4a) | Inclus dans l'échelle |
| partout-largeurs | Largeur selon le contenu (L1) | T4 (T4b) | Moyen |
| partout-q3-harmonie | Harmonie en 中文 : assumer le français, avec bandeau | T5 | Petit |
| partout-q3-guide | Guide : captures refaites en 中文 | T5 | Moyen |

Entrées par tranche : T1 = 5 · T2 = 1 · T3 = 2 · T4 = 3 · T5 = 2 (13 au total).

## Points à confirmer avant le code

1. **Halo du chant et de la liste des chants.** La planche se contredit : Q2 B (recommandée) fait *partir* le lavis du chant (`--sec-chorus`) et celui de la liste des chants (`--sec-verse`), alors que la piste C de la surface écrit « Halo du chant gardé, il porte une couleur ». La consigne de cette annexe dit « seulement ceux qui portent une couleur de service ou de section ». Suivi ici : Q2 B (le texte de la décision), qui motive le départ par le code de couleur du refrain. Si Timothée veut garder ces deux halos, l'entrée `partout-q2` perd les lignes « chant » et « liste des chants ».
2. **Valeur de `--shadow-flottant`.** La planche crée le jeton sans en donner la valeur. À relever au code (ombre actuelle de la barre d'onglets, des menus, des feuilles, des toasts) avant T2a, puis à inscrire ici.
3. **Piste C sur le chant en deux volets** : le dessin de la planche est un essai non vérifié (« à confirmer »). Premier point à maquetter en regardant l'écran réel au début de T2a (recherche, rail et menu des thèmes du groupe blanc en `--secondary`, « à confirmer »).
4. **Marges mesurées sur la police des captures (Linux)** pour `chants-1` : à revérifier sous Windows (Segoe) et Mac (SF).
5. **Lavis sur « Proposer un chant »** (`rgb(52,34,27)` au lieu de `#1c1c1e`) : à confirmer en direct ; il disparaît de toute façon avec le halo du chant (`partout-q2`).

---

## Recette de surface (C)

Décision : piste C « le fond de groupe » (repli : A « une carte, une ombre »). Elle revient sur le fond blanc choisi le 20/09 ; Timothée l'a validée en le sachant. Les décisions 5C1 « Encre · Relief », agencement v18, R4 et R5 ne sont pas défaites. `--primary` et `--sec-chorus` restent gelés.

### Jetons (`src/app/globals.css`, `tailwind.config.ts`)

| Jeton | Clair | Sombre | Remarque |
|---|---|---|---|
| `--background` | `0 0% 100%` (#fff) | `0 0% 0%` (#000) | inchangé (globals.css:189, 251) ; pages de lecture |
| `--fond-groupe` (nouveau) | `240 24% 96%` (#f2f2f7) | `0 0% 0%` (#000) | fond des pages de liste et de gestion |
| `--card` | `0 0% 100%` (#fff) | `240 3.4% 11.4%` (#1c1c1e) | inchangé (globals.css:191, 253) ; le groupe |
| `--radius-groupe` (nouveau) | `16px` | `16px` | rayons autorisés : 8 / 12 / 16 / plein |
| `--secondary` | `240 8.3% 95.3%` (#f2f2f4) | `240 2.2% 17.6%` (#2c2c2e) | inchangé ; contrôles posés sur fond blanc (pages de lecture, intérieur d'un groupe) |
| `--secondary-fond` (nouveau) | #e5e5ea (≈ `240 11% 91%`) | #2c2c2e (`240 2.2% 17.6%`) | contrôles posés sur `--fond-groupe` (rail, pistes, champs) |
| `--muted-foreground` | `240 2.7% 43.5%` (#6c6c72) | `240 3.5% 61%` (#98989f) | inchangé ; ≈ 4,6:1 sur #f2f2f7 |
| libellés inactifs sur `--secondary-fond` | encre à 70 % | inchangé | #6c6c72 ne donne que ≈ 4,1:1 sur #e5e5ea |
| `--shadow-raised` | `0 4px 14px rgba(28,28,30,.10), 0 1px 2px rgba(28,28,30,.06)` | `0 0 0 1px rgba(255,255,255,.10)` | valeurs inchangées (globals.css:214, 273) ; commandes |
| `--shadow-flottant` (nouveau) | à relever (voir point 2) | à relever | barre d'onglets, menus, feuilles, toasts |
| `--shadow-soft` | supprimé | supprimé | globals.css:211, 271 et classe `.shadow-soft` (globals.css:353-355) |

Dans `tailwind.config.ts` : couleurs `fond-groupe` et `secondary-fond` (au même schéma `hsl(var(--…))` que `card`), `borderRadius.groupe: "var(--radius-groupe)"`.

### Règles

- **Groupe** : `--card`, rayon 16, ni bordure ni ombre. Une seule recette de groupe pour tout le site.
- **Bloc d'information non touchable** (verset, état vide, bandeau) : aplat `--secondary`, rayon 16, sans ombre ni pointillés.
- **Fond de page** `--fond-groupe` posé **une fois**, dans `EnTetePage` (src/components/layout/EnTetePage.tsx:35) et `DeuxVolets` (src/components/layout/DeuxVolets.tsx:27), sur : accueil, planning, setlists, chants, statistiques, Mes services, Moi, évènements, Back-Office. Les **pages de lecture restent blanches** : chant, setlist en lecture, mode louange, Harmonie, guide, connexion.
- **Contrôles** posés sur le fond gris : `--secondary-fond` ; recherche et boutons ronds en blanc, sans ombre. Sur les pages de lecture blanches, les commandes gardent `--shadow-raised` (5C1).
- **Ombre réservée à ce qui flotte** (`--shadow-flottant`) : barre d'onglets, menus, feuilles, toasts. Barre latérale inchangée.
- **Interdits** : carte dans une carte ; bordure et ombre ensemble ; rayon hors de 8 / 12 / 16 / plein.
- Les teintes `.svc-tuile` (globals.css, `--svc-tint: 13%`) foncent légèrement sur le gris : elles restent dans des groupes blancs.
- Sombre : aucun changement visible (`--fond-groupe` = `--background`).
- Halos : voir « Halos (B) ».

### Écrans pilotes (à faire en premier, T2a)

- **Accueil** (téléphone) : « Ce dimanche · 8 novembre » en 17/23 sur le gris ; verset sans aplat (15/21, encre à 70 %, référence en 13 px) ; menu « Accueil ⌄ » et cloche en blanc.
- **Setlists** (téléphone) : rail sur une piste #e5e5ea à curseur blanc, recherche blanche, la ligne de setlist dans un groupe blanc (aujourd'hui nue sur téléphone, en carte `.raised` à 1 280). À 1 280, les contrôles sortent de la carte et seule la liste reste dedans. « Mes services » : carte dans la carte à supprimer.
- **À faire** (1 280) : `src/components/backOffice/aFaire/AFaire.tsx:92` (`rounded-2xl border border-border bg-card` → groupe sans bordure) ; « Cette semaine » et « À lire ou à relier » en groupes blancs sans contour ; `src/components/backOffice/aFaire/ColonneDroite.tsx:17` (`CARTE = "rounded-2xl bg-secondary …"` → mêmes groupes blancs) : une seule recette sur l'écran.
- **Chants en deux volets** (1 280) : la liste (`.chants-volets > .chants-liste`, globals.css:693, 706, 719, aujourd'hui `background-color: hsl(var(--raised)); box-shadow: var(--shadow-raised)`) devient un groupe `--card` sans ombre ; la page du chant, page de lecture, reste blanche : un grand groupe `--background` posé sur le gris, rayon 16, sans ombre ; Statistiques en blanc sans ombre ; recherche, rail et menu des thèmes en `--secondary` dans le groupe blanc (à confirmer, point 3) ; barre d'outils du chant en `--shadow-raised`.

### Fichiers à migrer

- `src/app/globals.css`, `tailwind.config.ts` : jetons ci-dessus.
- `src/components/ui/group.tsx` : le groupe (`rounded-groupe bg-card`, sans bordure ni ombre).
- `src/components/layout/EnTetePage.tsx`, `src/components/layout/DeuxVolets.tsx` : fond posé une fois.
- `.shadow-soft` : 20 fichiers sous `src/` (`grep -rln shadow-soft src` en donne 21 avec globals.css) ; la classe est supprimée, chaque usage retiré.
- `.raised` / `--shadow-raised` : 70 fichiers contiennent « raised » (la planche en comptait 67). Tri : l'ombre reste sur les commandes (boutons, recherche, pilule d'outils), part des groupes, passe à `--shadow-flottant` pour ce qui flotte.
- Tests `tests/look-*.spec.ts` (fondations, secondaires, barres, navigation, planning, recents, zone-sure, louange).

### Ordre interne

- **T2a** : jetons (globals.css, tailwind.config.ts) ; `group.tsx` ; fond posé dans `EnTetePage` / `DeuxVolets` ; les quatre écrans pilotes ci-dessus ; regard à l'œil sur les quatre dispositions plus 1 440 px, clair et sombre. Go séparé après validation visuelle.
- **T2b** : le reste des pages (tri des 70 fichiers `.raised`, retrait des 20 `shadow-soft`).

---

## Contrôles (jeu B)

Décision : jeu de trois contrôles, **rail, pilule, menu** ; pas de feuille de filtres (jeu A écarté). Plus aucun `<select>` natif visible hors formulaire. Un seul menu déroulant, une seule hauteur par famille.

### Composants

- **Rail** (`OngletsRail`, src/components/layout/Onglets.tsx:57, inchangé dans son rôle : choisir une vue) : 36 px au pointeur fin, 40 px au toucher, portés à 44 px par un `::after` (comme les pilules). Piste `--secondary` (`--secondary-fond` sous la surface C), marge de 3 px. Curseur `--background` avec `--shadow-raised`. Texte 13 px semi-gras. **Largeur au contenu** : le rail de Setlists passe de 920 à ≈ 380 px ; pleine largeur seulement pour la vue principale au téléphone.
- **Pilule** (`Pilules`, src/components/layout/Onglets.tsx:154) : 28 px au pointeur fin, 32 px au toucher, zone de 44 px par `::after`. Rayon plein, marge de 12 px, 6 px entre deux. Inactive : `--secondary` à texte encre ; active : `--primary`, ou la couleur du service pour les plannings (R4). Au toucher la rangée défile avec `fondu-lateral` ; au pointeur fin elle passe à la ligne ; le rond « › » d'Équipes disparaît.
- **Menu** (nouvelle primitive `Menu`, sur `src/components/ui/dropdown-menu.tsx`) : déclencheur en forme de pilule (28 / 32 px, `--secondary`, sans bord, chevron 14 px) ; une valeur autre que la valeur par défaut le met en encre pleine (un filtre posé se voit). Panneau `material-panel`, rayon 12, lignes de 36 px au pointeur fin et 44 px au toucher, coche à gauche, 320 px de haut au plus.
- **Formulaires** : le `<select>` natif reste (la roue d'iOS est bonne au téléphone), habillé comme un champ : 44 px, rayon 12, `--secondary`, chevron lucide de 16 px, police du site. Ces habillages se trouvent dans une dizaine de fichiers (liste ci-dessous).
- « ✓ Mes services » : devient une **pilule-bascule ordinaire** ; l'encre dit « actif », la coche part. « Sélectionner » (setlists) est une action, pas un choix : texte souligné, hors des primitives.

### Où chaque contrôle s'applique

| Écran | Aujourd'hui | Cible |
|---|---|---|
| Statistiques (`src/app/songs/statistiques/StatistiquesClient.tsx`) | rail + pilules noires + 2 menus à contour (`<select>` habillé en pastille, l. 428-438 ; tri l. 518) | 3 rangées : rail des vues · pilules des périodes · trois `Menu` (service, langue, présidence). Chaque rangée défile avec fondu au toucher, passe à la ligne au pointeur fin ; périodes et menus ne partagent jamais la même rangée (plus d'orphelin) |
| Setlists (`src/app/setlists/page.tsx:469-499`) | `<select>` natif « Toutes » + optgroups | `Menu` « Tous les services » ; « Mes services » en pilule |
| Chants (`src/app/songs/SongListClient.tsx:278-291`) | `<select>` gris plein « Tous les thèmes » (32 px, rayon 6) | `Menu` thèmes |
| Harmonie (`src/components/harmonie/FicheHarmonie.tsx:133, 178`, `IdeesSheet.tsx:604`) | pilules coupées, `<select>` « Tonalité » | « Piano · Guitare » en rail ; « Tonalité » en `Menu` ; sensations, moments, niveaux en pilules |
| Équipes (`src/app/equipes/EquipesClient.tsx`) | rangée « Église · Paix · Fidélité… » avec rond « › » | rail avec pastille de couleur (`couleur` de `OngletRail`, déjà prévu par R4), sans flèche. « Équipes · Musiciens » reste en pilules (R4). Back-Office : « Tout · Mes équipes » reste en pilules (filtre) |

### Libellés (fr et zh-CN)

- `setlists.list.allCategories` (src/locales/fr.json:194, zh-CN.json:194) : « Toutes » → « Tous les services » ; 全部类型 → « 所有聚会 ». Seul usage : src/app/setlists/page.tsx:475. (La valeur d'option `"Toutes"` du code reste.)
- Réutilisés tels quels : `stats.tousServices` (« Tous les services » / 所有聚会), `stats.langue` (« Langue » / 语言), `stats.frEtZh` (« FR et 中文 »), `stats.toutesPresidences` (« Toutes les présidences » / 所有主领), `stats.reunionsPrincipales`, `stats.groupes`, `stats.autres` (fr.json:4070-4077 ; zh-CN.json:4025-4032). Les mots chinois sont plus courts : aucune coupe.
- Pas de « Filtres / 筛选 » ni « Tout effacer / 全部清除 » : ils servaient la feuille du jeu A, écartée.

### Ordre interne

- **T3a** : primitive `Menu` (dropdown-menu.tsx) et habillage du `<select>` de formulaire.
- **T3b** : Statistiques, Setlists, Chants, Harmonie.
- **T3c** : Équipes (rail, sans flèche) et les formulaires restants.

Fichiers `<select>` à habiller (hors les quatre de T3b) : `EvenementForm.tsx`, `PublishPlanningPanel.tsx`, `AjouterDate.tsx`, `LastPhraseSheet.tsx`, `Bibliotheque.tsx`, `EnTeteEditeur.tsx`, `Reglages.tsx`, `TacheForm.tsx`, `MesAbsences.tsx`, `Notifier.tsx`, `PiluleTonalite.tsx`, `OrdrePassage.tsx`, `SaisonForm.tsx`, `Inscriptions.tsx`, `PartitionView.tsx` (`grep -rln "<select" src`).

---

## Typographie et largeurs (échelle B, P12/P13, L1)

### Échelle B (`tailwind.config.ts:80-86`)

| Cran | Taille / interligne | Interlettrage | Changement |
|---|---|---|---|
| `xs` | **12 / 16** | **+0,005em** | était 11 / 14, +0,01em |
| `sm` | 13 / 18 | — | inchangé |
| `base` | 15 / 21 | — | inchangé |
| `lg` | 17 / 23 | −0,01em | inchangé |
| `xl` | 22 / 27 | −0,015em | inchangé |
| `2xl` | 30 / 34 | −0,02em | inchangé |

Correspondances du codemod : 10 à 11,5 px → `xs` ; 12 et 12,5 → `xs` ; 13 à 14 → `sm` ; 14,5 à 16 → `base` ; 17 à 19 → `lg` ; 22 à 26 → `xl` ; 28 à 34 → `2xl`.
Exceptions (inchangées) : champs en 16 px au téléphone (sinon iOS zoome), paroles (`--lyric-size`), mode louange, 简谱, PDF, pastilles de tonalité, compteur dans une pastille de 16 px.
Constat de départ : `text-[13px]` 245 fois (confirmé au code), `[15px]` 140, `[11px]` 100 ; hors échelle : 14 px (43), 16 px (30), 12 px (23), 24 px (18), 12,5 px (16), 13,5 px (13), 19, 28, 10, 14,5.

### Plancher P12 + P13

- **P12** : aucun texte sous 12 px nulle part, hors partitions, 简谱, PDF, compteur dans une pastille de 16 px. Vérifiable par recherche de `text-[11px]` et `text-[10px]` (zéro résultat hors exceptions).
- **P13** : à partir de 1 024 px, le texte gris (`--muted-foreground`) ne descend pas sous 13 px ; le 12 px reste permis pour l'encre (badges). Mise en œuvre proposée (à valider au code) : une règle `@media (min-width: 1024px)` sur `.text-xs.text-muted-foreground` dans `globals.css` qui relève à 13 / 18.

### Largeurs L1

- Liste ou formulaire : colonne de **720 px au plus**, alignée à gauche sur le titre, jamais centrée (v18 R2).
- Blocs (accueil du Planning, cartes d'équipes) : grille pleine largeur `auto-fill minmax(280px, 1fr)`.
- Grille de données (planning, calendrier) : pleine largeur jusqu'à 1 440 px. L'en-tête de page suit la largeur de son contenu.
- Paragraphes plafonnés à 65 caractères.

### Ordre interne

- **T4a** : échelle + plancher : codemod dossier par dossier (`src/components/…`, puis `src/app/…`), une passe et un commit par dossier ; regarder les vignettes de date et les badges (tous les `text-xs`, 409, grandissent d'un pixel).
- **T4b** : largeurs L1 (Mes services d'abord, puis les listes et formulaires). Go séparé. En dernier, car T4 touche presque tout.

---

## Titres de chants (C)

Décision (Q1) : **casse normale sur la page chant, capitales gardées en mode louange**. Le PDF garde ses capitales (zone gelée). L'interlettrage de la page passe de −0,4 px à −0,02em ; le KaiTi des titres chinois ne change pas. La barre du haut du mode louange est déjà en casse normale.

| Écran | Fichier | Aujourd'hui | Cible |
|---|---|---|---|
| Page chant | `src/components/song/SongView.tsx:795` | `text-[26px] … tracking-[-0.4px] uppercase` | retirer `uppercase`, `tracking-[-0.02em]` → « Abba Père » |
| Mode louange | `src/components/performance/PerformanceMode.tsx:177` (titres fusionnés) et `:202` | `uppercase tracking-tight` | inchangé (capitales) |
| PDF | `src/components/pdf/` | capitales | gelé |
| Liste des chants | — | casse normale | inchangé |

Le libellé de section en capitales (`SongView.tsx:609`, `uppercase tracking-[0.1em]`) n'est pas un titre de chant : ne pas y toucher.

---

## Halos (B)

Décision (Q2) : **seulement les halos qui portent une couleur** de service, de culte ou de section ; un halo veut toujours dire quelque chose. Cela protège le code de couleur gelé du refrain (orange). Voir « Points à confirmer » n° 1 pour le chant et la liste des chants.

**Restent** : Planning (couleur de l'onglet de service, `src/components/planning/PlanningHalo.tsx`, posé par `src/app/planning/layout.tsx` et `src/app/back-office/planning/layout.tsx`), fiche de setlist (couleur du culte, `src/app/setlists/[id]/SetlistDetailClient.tsx:1569`), évènements et scène (`src/app/evenements/SectionEvenements.tsx:47`, `src/app/back-office/evenements/layout.tsx:57`).

**Partent** :

| Halo | Fichier |
|---|---|
| défaut encre et bleu-gris du Back-Office | `src/components/layout/HaloParDefaut.tsx` (monté dans `src/app/layout.tsx:83`) ; règles `.halo-defaut` et `--halo-back-office` dans `globals.css:91-99` et `:797-805` |
| connexion et inscription | `.panneau-marque` (`globals.css:762-775`) : panneau uni `--secondary / 0.5`, logo seul ; `src/components/auth/EcranMarque.tsx:78` |
| chant (pêche, `--sec-chorus`) | `src/app/songs/[slug]/SongDetailClient.tsx:341` (`variant="chant"`) |
| liste des chants (vert, `--sec-verse`) | `src/app/songs/ChantsVolets.tsx:43` ; `--halo-chants` (`globals.css:691, 704, 717`) ; commentaire `src/app/songs/ChoisisUnChant.tsx:142` |
| setlists (bleu des accords) | `src/app/setlists/page.tsx:612` |
| Moi, Équipes, guide, questionnaire, organigramme (encre) | `src/app/moi/page.tsx:174`, `src/app/equipes/EquipesClient.tsx:205, 220`, `src/app/equipes/EquipesApp.tsx:66`, `src/app/guide/page.tsx:174`, `src/app/questionnaire/page.tsx:262, 335`, `src/components/groupes/OrganigrammeGroupe.tsx:401` |

Les barres repeignent une copie du halo (`FondDeBarre`, `.barre-halo`, `:root:has(.halo…)`) : après le retrait, une page sans halo ne doit laisser ni `--halo` ni copie visible sous les barres.

---

## Chinois

Décision (Q3) : **Harmonie : assumer le français honnêtement** (bandeau en tête de fiche ; passer à B « traduire les fiches » si un musicien qui ne lit que le chinois le demande — donnée manquante : combien sont-ils). **Guide : captures refaites en 中文** (planche B), *après* T2 à T4 pour ne pas les refaire deux fois (T5).

- Bandeau Harmonie en 中文 (13/18, aplat `--secondary`, rayon 16, sans ombre) : « 本部分内容目前只有法语版本。» ; 14 fiches (≈ 17 000 mots, `docs/harmonie/*.md`) et 26 cours (≈ 32 500 mots, `docs/harmonie/cours/*.md`) restent en français.
- Guide : 15 captures en 中文 dans `public/guide/zh/` (les 15 actuelles sont dans `public/guide/`), produites par `tests/guide-captures.spec.ts` (langue `zh-CN`, sortie `public/guide/zh/`, mesures par langue).
- Traduction « Mes services » : 我的服事 partout (voir `partout-servir`).
- Hors périmètre de cette annexe : traduire les fiches et cours d'Harmonie (lot de contenu à part, gros).

---

## Entrées

### chants-1 · Sélecteur d'espace qui déborde (« Back-Office » coupé)
- Tranche : T1
- Décision : A · resserrer (avec back-office-1, même fichier). Ni le vocabulaire ni le geste ne changent.
- À faire : dans `src/components/layout/SelecteurEspace.tsx`, le segment (`lien`, l. 158 : `px-3.5 py-1.5 … text-[13px] font-semibold`) devient `flex-auto min-w-0`, marge de 8 px (`px-2`), texte `text-[12px] font-semibold` à interlettrage −0,01em, hauteur dessinée de 30 px ; le conteneur (l. 171 : `shrink-0 rounded-full bg-secondary p-[3px]`) prend toute la largeur de la barre en mode `pleineLargeur` (220 px utiles dans la barre de 248 px). Mesures attendues : ≈ 38 + 75 + 84 + 6 = 203 px pour 220 px utiles (avant : 52 + 92 + 102 + 6 = 252 px, 32 px de trop). Cible de toucher à 44 px assurée par le `::after` existant (`after:-inset-y-2` : 30 + 16 = 46 px). Libellés inchangés (`backOffice.selecteur.app / musiciens / backOffice`, fr.json:3615-3620 ; zh-CN.json:3572-3577). Le même composant sert la barre du haut au téléphone (`Navbar.tsx:155`, sans `pleineLargeur`) ; la barre latérale (`BarreLaterale.tsx:277`) est le cas qui déborde. À coder avec back-office-1 (annexe du Back-Office) pour ne toucher le fichier qu'une fois.
- Critères : « Back-Office » entier, sans « … », dans la barre dépliée (ordinateur, tablette paysage dépliée, 1 440 px), fr et zh-CN, clair et sombre ; somme des segments ≤ 220 px ; segment hauteur dessinée 30 px, zone de clic ≥ 44 px ; barre du haut du téléphone et de la tablette portrait toujours lisible.
- Test : adapter `tests/back-office-espace.spec.ts` (largeur des trois segments et absence de `text-overflow` sur la barre latérale) ; mesure `getBoundingClientRect` des segments et du conteneur.
- Vigilance : largeurs mesurées sur la police des captures (Linux) ; à vérifier sous Windows (Segoe, plus large) et Mac (SF) : marge réelle de 17 px seulement. 12 px est le plancher de l'échelle (P12), pas en dessous.

### chants-7 · Même icône pour Musiciens et Chants en barre réduite
- Tranche : T1
- Décision : A · batterie. Musiciens prend `Drum`.
- À faire : `src/components/layout/SelecteurEspace.tsx:124` : `musiciens: Music` → `musiciens: Drum` ; ajouter `Drum` à l'import de `lucide-react` (l. 11) et retirer `Music` de l'import s'il n'est plus utilisé dans le fichier. `src/lib/navigation.ts:37` (Chants = `Music`) ne change pas. Icônes déjà prises côté Musiciens : Accords `Guitar`, RD-2000 `KeyboardMusic`, Harmonie `Sparkles`, Théorie `BookOpen`. Vérifié : `Drum` existe dans la version installée de `lucide-react`.
- Critères : en barre réduite (tablette paysage, ordinateur replié), l'icône de l'espace Musiciens diffère de celle de l'entrée Chants, lisible à 18 px, clair et sombre. Barre dépliée inchangée (segments de texte).
- Test : `tests/back-office-espace.spec.ts` ou `tests/navigation-grand-ecran.spec.ts` : dans `[data-testid="selecteur-icones"]`, le segment Musiciens ne porte pas la même icône (SVG différent) que le lien Chants.
- Vigilance : « évoque un seul instrument » ; captures du guide à refaire si elles montrent la barre réduite (T5).

### partout-q1 · Titres de chants : casse normale sur la page, capitales en mode louange
- Tranche : T1
- Décision : C · casse normale sur la page chant, capitales gardées en mode louange.
- À faire : `src/components/song/SongView.tsx:795` : retirer `uppercase` et passer `tracking-[-0.4px]` à `tracking-[-0.02em]` (voir la section « Titres de chants »). `PerformanceMode.tsx:177, 202` et le PDF inchangés. Aucune clé de traduction.
- Critères : sur la page chant, « Abba Père » (et son équivalent chinois en KaiTi, inchangé) s'affiche comme dans la liste ; en mode louange, la scène reste en capitales ; le PDF reste en capitales. Quatre dispositions plus 1 440 px, fr et zh-CN, clair et sombre.
- Test : nouvelle vérification dans `tests/look-louange.spec.ts` (déjà sur les quatre dispositions + 1 440) : `getComputedStyle(h1).textTransform` vaut `none` sur la page chant et `uppercase` sur la scène du mode louange (viser la scène avec `onStage`).
- Vigilance : deux graphies selon l'écran ; la scène se lit de loin et rappelle la partition imprimée.

### partout-q2 · Halos : seulement ceux qui portent une couleur
- Tranche : T1
- Décision : B · porteurs seulement (voir « Halos (B) » pour la liste des fichiers, et « Points à confirmer » n° 1 pour le chant et la liste des chants).
- À faire : retirer les halos listés dans la section « Halos (B) » : `HaloParDefaut.tsx` (et son montage `src/app/layout.tsx:83`, et les règles `.halo-defaut` de `globals.css:91-99`, `--halo-back-office` `globals.css:797-805`), `.panneau-marque` (fond uni `hsl(var(--secondary) / 0.5)`, plus de dégradés, globals.css:762-775), les `<Halo>` de Moi / Équipes / guide / questionnaire / organigramme, du chant, de la liste des chants (et `--halo-chants`), des setlists. Garder Planning, fiche de setlist, évènements, scène. Aucune clé de traduction.
- Critères : exactement zéro halo visible sur les pages retirées ; un halo coloré (service ou culte) sur Planning, fiche de setlist, évènements, scène ; sous les barres, aucune copie de halo sur une page sans halo ; connexion en panneau uni avec logo seul. Quatre dispositions plus 1 440, clair et sombre.
- Test : adapter `tests/halo-partout.spec.ts` (il exige aujourd'hui « exactement un halo visible » sur toutes les pages : il devient « un halo seulement sur les pages porteuses, aucun ailleurs »), `tests/look-halo.spec.ts` et `tests/look-halo-defilement.spec.ts` (déjà sur les quatre dispositions + 1 440).
- Vigilance : le bouton « Proposer un chant » (`rgb(52,34,27)` au lieu de `#1c1c1e`, à confirmer en direct) doit redevenir `#1c1c1e` sans le lavis du chant. Sur la page chant, un lavis orange sans rapport brouillait le code de couleur du refrain (gelé). Pages plus nues : assumé.

### partout-servir · « Mes services » : une seule traduction chinoise
- Tranche : T1
- Décision : 我的服事 partout (la traduction de l'en-tête) ; proposition du maquettiste que le directeur artistique ne tranche pas, validée avec « comme recommandé pour tout ».
- À faire : `src/locales/zh-CN.json:211` : `setlists.list.myServicesFilter` « 我的服侍 » → « 我的服事 » (l'en-tête `common.header.myServices`, zh-CN.json:13, vaut déjà 我的服事). Le français ne change pas (fr.json:211, « Mes services »). Chercher les autres occurrences de 服侍 dans `src/locales/zh-CN.json` et `docs/` : `grep -n 服侍 src/locales/zh-CN.json`.
- Critères : un seul terme chinois pour « Mes services » dans l'en-tête, la page Moi et le filtre des setlists.
- Test : vérification par `grep` (aucune occurrence de 我的服侍) ; la clé est lue par `tests/setlists*.spec.ts` s'il en existe en zh-CN (à chercher avant de livrer).
- Vigilance : aucune.

### partout-surface · Recette de surface : fond de groupe (piste C)
- Tranche : T2
- Décision : C · le fond de groupe (repli A). Revient sur le fond blanc du 20/09, sciemment.
- À faire : tout ce qui figure dans la section « Recette de surface (C) » : jetons `--fond-groupe`, `--radius-groupe`, `--secondary-fond`, `--shadow-flottant` ; suppression de `--shadow-soft` et `.shadow-soft` ; `group.tsx`, `EnTetePage`, `DeuxVolets` ; tri des 70 fichiers `.raised` et retrait des 20 `shadow-soft` ; `AFaire.tsx:92` et `ColonneDroite.tsx:17` ; `.chants-liste` (globals.css:693, 706, 719) ; sous-tranches T2a (jetons + pilotes) puis T2b (le reste).
- Critères : sur téléphone, tablette portrait, tablette paysage, ordinateur et 1 440 px, clair : pages de liste et de gestion sur #f2f2f7 avec groupes blancs sans ombre ni bordure ; pages de lecture (chant, setlist en lecture, mode louange, Harmonie, guide, connexion) blanches ; ombre seulement sur les commandes des pages blanches et sur ce qui flotte. Sombre : aucun changement visible. Contraste : #6c6c72 sur #f2f2f7 ≈ 4,6:1 ; libellés inactifs sur #e5e5ea à 70 % d'encre ≥ 4,5:1. À 1 280 px, À faire montre une seule recette (colonne de droite comprise). fr et zh-CN.
- Test : adapter `tests/look-fondations.spec.ts`, `look-secondaires.spec.ts`, `look-barres.spec.ts`, `look-navigation.spec.ts`, `look-planning.spec.ts`, `look-recents.spec.ts`, `look-zone-sure.spec.ts` (valeurs de fond, d'ombre et de rayon des groupes) ; ajouter à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`) toute nouvelle spec d'agencement ; regard à l'œil sur les quatre dispositions plus 1 440.
- Vigilance : deux fonds selon le type de page, une page mal classée se voit (lister les pages de lecture dans le code) ; ne pas poser le fond ailleurs que dans `EnTetePage` / `DeuxVolets` ; teintes `.svc-tuile` à garder dans des groupes blancs ; piste C sur le chant en deux volets à maquetter en premier (essai non vérifié) ; une membre de l'équipe avait demandé de ne pas trop changer.

### partout-controles · Contrôles de choix : jeu B (rail, pilule, menu)
- Tranche : T3
- Décision : B · rail, pilule, menu (pas de feuille de filtres).
- À faire : tout ce qui figure dans la section « Contrôles (jeu B) » : primitive `Menu` sur `dropdown-menu.tsx`, rail au contenu, pilules 28 / 32 px, `<select>` de formulaire habillé (44 px, rayon 12, chevron 16 px), Statistiques en trois rangées, Setlists / Chants / Harmonie / Équipes comme dans le tableau, libellé `setlists.list.allCategories` → « Tous les services » / « 所有聚会 ». Sous-tranches T3a, T3b, T3c.
- Critères : plus aucun `<select>` natif visible hors formulaire ; une seule hauteur par famille (rail 36 / 40 px, pilule 28 / 32 px, menu 28 / 32 px) ; sur Statistiques au téléphone, trois rangées sans orphelin ; une valeur de filtre posée reste en encre pleine ; rail de Setlists ≈ 380 px au lieu de 920 ; en chinois, les menus ne coupent nulle part. Quatre dispositions plus 1 440, fr et zh-CN, clair et sombre.
- Test : `tests/retouches-v18-pilules-stats.spec.ts` (pilules et Statistiques), `tests/statistiques.spec.ts`, `tests/agencement-v18-harmonie.spec.ts`, `tests/equipes-agencement.spec.ts` ; ajouter une vérification « aucun `select` visible hors formulaire » (locator `select:visible` hors `form`) sur Statistiques, Setlists, Chants, Harmonie ; ajouter la spec à `SPECS_GRAND_ECRAN` si elle teste l'agencement.
- Vigilance : sur téléphone, une rangée qui défile peut cacher un filtre posé hors de l'écran, alors que « tout l'état est visible » est l'argument de la piste : **la valeur posée passe en tête de la rangée, ou un indice de défilement est ajouté** (à trancher au code, à voir sur capture). Sans coche, « Mes services » ne dit son état que par la couleur (encre ou gris), alors que l'encre veut déjà dire « filtre posé » : s'assurer d'un contraste suffisant et d'un `aria-pressed`. Menus et feuilles ouverts, survol, mouvement : non vus sur la planche, à regarder à l'œil.

### partout-zones-tactiles · Zones tactiles du rail et des pilules
- Tranche : T3
- Décision : rail à `::after` de 44 px ; recouvrement de 6 px toléré entre deux pilules voisines (proposition du maquettiste, « à confirmer au code »).
- À faire : dans `Onglets.tsx` (`OngletsRail`, `Pilules`), un `::after` portant la zone de toucher à 44 px (rail 36 / 40 px, pilule 28 / 32 px) ; entre deux pilules voisines (6 px d'écart), les zones de 44 px se recouvrent de 6 px ; le toucher va à la pilule dont le centre est le plus proche. À valider au code : si le navigateur donne le toucher au dernier élément dans l'ordre du DOM, réduire le `::after` horizontal des pilules pour qu'il s'arrête à mi-écart (3 px de chaque côté) plutôt que d'accepter le recouvrement.
- Critères : un toucher à 3 px de chaque côté du centre d'une pilule va à elle ; zone de toucher verticale ≥ 44 px (rail comme pilule) ; aucune pilule ne vole le toucher de sa voisine au centre.
- Test : nouvelle vérification dans `tests/retouches-v18-pilules-stats.spec.ts` (`page.touchscreen.tap` aux bords de deux pilules voisines, projet téléphone) ; mesure de la boîte du `::after` via `getComputedStyle`.
- Vigilance : recouvrement toléré par la planche mais jamais vérifié en vrai ; tester sur un appareil tactile réel si possible (non vu).

### partout-echelle · Échelle de texte B (xs à 12 / 16)
- Tranche : T4
- Décision : B · ajustée : `xs` passe à 12 / 16 (+0,005em), le plancher fait partie de l'échelle.
- À faire : `tailwind.config.ts:80` : `xs: ["12px", { lineHeight: "16px", letterSpacing: "0.005em" }]`. Codemod (≈ 80 fichiers, `text-[13px]` 245 fois, `[15px]` 140, `[11px]` 100…) selon les correspondances de la section « Typographie et largeurs », dossier par dossier : `text-[11px]`, `text-[10px]`, `text-[12px]`, `text-[12.5px]` → `text-xs` ; `text-[13px]`, `text-[13.5px]`, `text-[14px]` → `text-sm` ; `text-[14.5px]` à `text-[16px]` → `text-base` ; `[17px]` à `[19px]` → `text-lg` ; `[22px]` à `[26px]` → `text-xl` ; `[28px]` à `[34px]` → `text-2xl`. Les exceptions listées plus haut ne bougent pas. Aucune clé de traduction.
- Critères : à la fin, `grep` des tailles arbitraires `text-[Npx]` hors exceptions ne renvoie rien ; vignettes de date (« 14 nov. »), badges, compteurs lisibles à 12 px sans débordement ni coupe ; les 409 `text-xs` ont grandi d'un pixel sans casser de ligne. Quatre dispositions plus 1 440, fr et zh-CN, clair et sombre.
- Test : adapter `tests/look-fondations.spec.ts` (fonts-size de référence), ajouter un test de débordement (`scrollWidth <= clientWidth`) sur les vignettes de date et badges des pages Mes services, Planning, Setlists ; lancer `npx tsc --noEmit` et `npm run lint` après chaque dossier.
- Vigilance : « 12 et 12,5 px (badges, nov., compteurs) doivent choisir entre 11, trop petit, et 13, trop gros » : B tranche à 12. Le codemod est mécanique mais touche presque tout : une passe par dossier, un commit par lot (CLAUDE.md), regard à l'œil sur chaque.

### partout-plancher · Plancher : 12 px partout, 13 px pour le gris à partir de 1 024 px
- Tranche : T4
- Décision : P12 + P13 · aucun texte sous 12 px ; sur un écran de 1 024 px ou plus, le texte gris ne descend pas sous 13 px.
- À faire : P12 est acquis par `partout-echelle` (`xs` = 12). P13 : règle `@media (min-width: 1024px)` dans `globals.css` relevant `.text-xs.text-muted-foreground` à 13 / 18 (mise en œuvre à valider au code) ; le 12 px reste permis pour l'encre (badges). Exemple de la planche : « Active les rappels de service » / « Reçois un rappel avant chaque service… » (`push.promptTitle` / `push.promptText`, fr.json:2763-2764 ; `src/components/push/PushPrompt.tsx:87`) : texte gris en 13 px à 1 280, titre 15/21.
- Critères : sur téléphone et tablette portrait, aucun texte < 12 px ; à partir de 1 024 px (tablette paysage, ordinateur, 1 440 px), aucun texte gris < 13 px ; badges à encre toujours en 12 px.
- Test : nouvelle vérification dans `tests/look-fondations.spec.ts` : parcourir les nœuds texte visibles de Planning, Setlists, Mes services, Statistiques et vérifier `font-size` ≥ 12 (≥ 13 si `color` = `--muted-foreground` et largeur ≥ 1 024) ; exceptions partitions, 简谱, PDF, compteur 16 px.
- Vigilance : une règle de plus à tenir, par taille d'écran ; le gris reste petit sous 1 024 px.

### partout-largeurs · Largeur selon le contenu (L1)
- Tranche : T4
- Décision : L1 · le contenu décide de la largeur, pas la page (L2 « toujours pleine largeur » écarté).
- À faire : règles de la section « Typographie et largeurs » (colonne ≤ 720 px alignée à gauche pour listes et formulaires ; `auto-fill minmax(280px, 1fr)` pour les blocs ; pleine largeur jusqu'à 1 440 px pour les grilles de données ; en-tête de page à la largeur de son contenu). Cas pilote, **Mes services** à 1 280 px (`src/components/mesServices/SectionMesServices.tsx`, `ListeMesServices.tsx`) : colonne de x 40 à 760 (720 px) ; bandeau de rappels (`PushPrompt.tsx`) en groupe blanc (cloche 20 px, titre 15/21, texte 13/18 gris au lieu de 11, bouton encre de 32 px) ; rail « À venir · Passés » au contenu ; état vide de 720 × 96 sans pointillés. À droite, 232 px restent vides : assumé. Aucune clé de traduction.
- Critères : à 1 280 et 1 440 px, Mes services tient dans 720 px alignée à gauche sur le titre, jamais centrée ; planning et calendrier restent pleine largeur jusqu'à 1 440 ; sur téléphone et tablette portrait, aucune colonne n'est plus étroite qu'aujourd'hui ; aucun scroll horizontal.
- Test : `tests/pages-en-grand-mes-services.spec.ts` (mesure de la largeur de colonne), `tests/largeurs-b4.spec.ts` et `tests/pages-en-grand-guide-equipes.spec.ts` à adapter ; vérifier leur présence dans `SPECS_GRAND_ECRAN`.
- Vigilance : 232 px vides à droite assumés ; ordre de livraison : après l'échelle (T4a) pour regarder les largeurs avec les bonnes tailles de texte.

### partout-q3-harmonie · Harmonie en 中文 : assumer le français, avec bandeau
- Tranche : T5
- Décision : A · assumer le français, honnêtement (pour Harmonie, tout de suite) ; passer à B (traduire les fiches) si un musicien qui ne lit que le chinois le demande.
- À faire : afficher, en tête de fiche, quand la langue d'interface est le chinois, un bandeau gris (aplat `--secondary`, rayon 16, sans ombre, 13/18) : « 本部分内容目前只有法语版本。» Créer la clé `harmonie.bandeauFrancais` (fr : « Cette partie n'existe qu'en français pour l'instant. » ; zh-CN : « 本部分内容目前只有法语版本。») dans l'objet `harmonie` (fr.json:2908, zh-CN.json:2874), insérée en texte au bon endroit ; composant : `src/components/harmonie/FicheHarmonie.tsx` (fiches) et `src/app/harmonie/(catalogue)` / `cours` (en-tête des cours, même bandeau). Le bandeau ne s'affiche qu'en zh-CN.
- Critères : en 中文, chaque fiche et chaque cours porte le bandeau, lisible (13 px, gris ≥ 4,5:1) ; en français, rien ne change. Quatre dispositions, clair et sombre.
- Test : adapter `tests/harmonie-catalogue.spec.ts` et `tests/harmonie-cours-lecture.spec.ts` (nouvelle assertion en zh-CN : bandeau visible ; en fr : absent).
- Vigilance : le musicien qui ne lit que le chinois ne lit toujours pas les fiches ; donnée manquante (combien sont-ils) qui décide du passage à B.

### partout-q3-guide · Guide : captures refaites en 中文
- Tranche : T5
- Décision : B · traduire ce qui sert le plus : les 15 captures du guide en 中文 (la traduction des fiches reste hors périmètre).
- À faire : dans `tests/guide-captures.spec.ts` (aujourd'hui `locale: "fr-FR"` fixe, l. 31, sortie `SORTIE = "public/guide"`, l. 38, lancé par `GUIDE_CAPTURES=1`), ajouter la langue zh-CN, une sortie `public/guide/zh/` et des mesures par langue ; produire les 15 captures chinoises ; faire lire par le composant du guide (`src/app/guide/page.tsx`, `src/components/guide/GuideFigure.tsx`) la capture `public/guide/zh/…` quand la langue d'interface est le chinois, avec repli sur la capture française. Pas de ligne de légende « 截图为法语界面… » (c'était la piste A, écartée pour le guide). À lancer **après T2 à T4** pour ne les produire qu'une fois.
- Critères : en 中文, chaque figure du guide montre l'interface en chinois ; le repli sur le français reste valable si une capture manque ; poids des images raisonnable (`public/guide/zh/` ≈ celui de `public/guide/`).
- Test : `tests/guide-captures.spec.ts` (génération) et `tests/guide-b6.spec.ts` (le guide affiche la capture de la langue).
- Vigilance : si faite avant T2 à T4, les captures sont refaites deux fois. Les captures du guide en français sont aussi à refaire après T2 à T4 si l'apparence a changé.
