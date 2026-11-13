# Annexe de spec · corrections du design · groupe Équipes et tâches (App)

Source : planche `docs/planches/planche-corrections-equipes-app.html` ; décisions : recommandations (Timothée, 03/11/2026)

Six constats retenus (aucun écarté à la contre-vérification, aucun gelé retiré ; equipes-app-1 touche la liste gelée des labels contextuels du 15/09/2026, étendue par décision de Timothée). Tous relèvent de la tranche T1 : ce sont des défauts propres à une page ou à un composant, qui ne dépendent d'aucun des chantiers 2 à 5. T2, T3, T4 et T5 : aucun constat de ce groupe en propre (la planche signale que equipes-app-6 recroisera la recette de surface en T2 et l'échelle typographique en T4 : voir sa vigilance). Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| equipes-app-1 | T1 | petit |
| equipes-app-2 | T1 | petit |
| equipes-app-3 | T1 | petit |
| equipes-app-4 | T1 | petit |
| equipes-app-5 | T1 | très petit, plus le regard sur les titres longs |
| equipes-app-6 | T1 | petit |

Ordre conseillé dans T1 : equipes-app-3 avant equipes-app-2 (le rond de la fiche disparaît avec equipes-app-3 A : un seul rond reste à corriger, celui de `TacheLigne.tsx`) ; equipes-app-4 avant equipes-app-5 (le sous-titre change d'emplacement, la capture de contrôle du titre se prend après).

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte, jamais par `json.dump`.
- Noms fictifs dans les tests (la planche utilise « Alix D. », « Zoé F. », équipe « DA » : ne pas les reprendre tels quels si des vrais noms de membres y ressemblent ; inventer pour chaque test).
- `FicheTache.tsx` est un composant partagé : la fiche du Back-Office (`src/app/back-office/taches/[equipe]/[id]/page.tsx`) passe par lui ; toute modification se regarde aussi là.

---

### equipes-app-1 · Page d'équipe sans onglet allumé, marque « Louange »
- Tranche : T1
- Décision : A, « Moi » allumé sur `/equipes` et marque « GCC Équipes » / « GCC 团队 » (B, « GCC Tâches », affiche un mot faux ; C, le nom de l'équipe, entame le principe d'une liste fermée de labels). Recoupe back-office-8 de la planche Back-Office (allumer « Moi » sur `/equipes`) : la piste A d'ici la contient, ne la faire qu'une fois.
- À faire :
  - `src/lib/navigation.ts:41` (entrée « Moi » de `ENTREES_MEMBRE`) : ajouter `"/equipes"` à `actifSur` (après `"/taches"`). `estEntreeActive` couvre déjà les sous-pages (`/equipes/<id>`), pas de `exact`.
  - `src/lib/navigation.ts:190-198` (`labelDeSection`) : ajouter `if (pathname.startsWith("/equipes")) return "common.header.equipes";` après la ligne du Back-Office (ligne 191) et avant les autres, de sorte que `/back-office/equipes` garde « Back-Office ». Mettre à jour le commentaire de la fonction si besoin (liste gelée du 15/09/2026 étendue d'une entrée, décision de Timothée).
  - Clés à créer, en texte, dans le bloc `common.header` après `"taches"` : `src/locales/fr.json:25` → `"equipes": "Équipes",` ; `src/locales/zh-CN.json:25` → `"equipes": "团队",` (mêmes mots que `backOffice.entrees.equipes`, `fr.json:2575`).
  - Aucun changement dans `Navbar.tsx:116` ni `BarreLaterale.tsx:220` : ils lisent déjà `labelDeSection`.
  - La planche cite `navigation.ts:41` et `:190-198` : exact.
- Critères : sur `/equipes/<id>`, « Moi » porte `aria-current="page"` (barre du bas au téléphone et en tablette portrait, rail en tablette paysage, barre latérale à l'ordinateur et à 1 440 px) ; la marque dit « GCC Équipes » / « GCC 团队 » sur les cinq dispositions, comme « GCC Tâches » sur `/taches`. La marque de `/back-office/equipes` reste « GCC Back-Office ». Français, chinois ; clair, sombre. En tablette portrait la marque tient dans sa place (environ 165 px avant le sélecteur d'espace).
- Test : adapter `tests/equipes-page.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`, cinq projets) : sur `/equipes/<id>`, `aria-current="page"` sur « Moi » et marque « Équipes » (fr) / « 团队 » (zh). Ajouter dans `tests/look-navigation.spec.ts` (autour de la ligne 62) un cas jumeau de celui de `/taches`.
- Points de vigilance de la planche : l'extension de la liste gelée des labels est la seule zone gelée touchée ; la taguer dans le message de commit. Si elle était refusée, le repli le plus petit serait B, mais il affiche un mot faux.

### equipes-app-2 · Rond à cocher trop pâle (2,03:1) et cible de 40 px
- Tranche : T1
- Décision : A, filet plein `muted-foreground`, rond de 22 px dans un bouton de 44 px (B, `foreground/50` à 3,29:1, trop juste au soleil ; C, rond de 24 px à filet de 1,5 px, mal dessiné sous Windows).
- À faire :
  - `src/components/taches/TacheLigne.tsx:74` : `border-muted-foreground/50` devient `border-muted-foreground` (filet de l'état « à faire »). Les états `enCours` (`border-foreground`) et `terminee` ne changent pas.
  - `src/components/taches/TacheLigne.tsx:69` (bouton `role="checkbox"`) : `h-10 w-10` devient `h-11 w-11`.
  - `src/components/taches/TacheLigne.tsx:59` (conteneur `group-row`) : `pl-1.5` devient `pl-0.5`, pour que le texte reste au même x (2 + 44 + 4 = 50 px).
  - Le rond de la fiche (`FicheTache.tsx:240-241`, `h-7 w-7`, `border-muted-foreground/50`) disparaît avec equipes-app-3 A : ne rien y changer ici. Si equipes-app-3 n'est pas fait, appliquer le même `border-muted-foreground`.
  - Une ligne non cochable garde son `disabled:opacity-50` (≈ 2,1:1, toléré pour un contrôle inactif : la différence devient visible).
  - Aucune clé de langue.
  - Le bouton « supprimer » voisin (`TacheLigne.tsx:85`, `h-10 w-10`) est hors lot.
- Critères : contraste du filet 5,22:1 en clair (#6c6c72 sur #fff), 5,94:1 en sombre (#98989f sur #1c1c1e) ; cible mesurée à 44 × 44 px au `boundingBox` ; le titre de la ligne reste au même x qu'avant (50 px depuis le bord de la ligne). Téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px ; clair et sombre ; fr et zh (aucun texte nouveau). Sur la ligne ouverte en pastille d'encre (`actif`, qui force `border-background` sur les enfants), le filet reste visible.
- Test : adapter `tests/taches.spec.ts` (trois appareils) : mesurer le `boundingBox` du `role="checkbox"` (44 × 44) ; contraste du filet par `getComputedStyle(...).borderColor` sur `#fff`. Pour la ligne ouverte, `tests/pages-en-grand-taches.spec.ts` (déjà en `SPECS_GRAND_ECRAN`) : filet visible sur pastille.
- Points de vigilance de la planche : la liste paraît un peu plus dense, avec un rond nettement visible à chaque ligne ; regarder les captures sur les cinq dispositions.

### equipes-app-3 · Statut dit deux fois dans la fiche, grand rond d'allure inerte
- Tranche : T1
- Décision : A, le segment seul ; la phrase d'état dessous seulement quand elle dit quelque chose (B, rond-bouton sans segment, cache « En cours » et change le geste).
- À faire :
  - `src/components/taches/FicheTache.tsx:237-250` (le bloc `<div className="flex min-w-0 flex-1 basis-56 items-center gap-3">` : span rond `h-7 w-7`, `<p className="text-base font-bold">{t(`taches.etat.${etat}`)}</p>` et `sousTitre`) : supprimer le rond (`:239-244`) et le libellé gras (`:247`). Garder le `sousTitre` (défini `:149-151`) : `<p className="text-[13px] text-muted-foreground">` rendu seulement s'il existe.
  - Mise en page de la carte `<section className="raised rounded-2xl px-4 py-3.5 …">` (`:236`) : un volet (téléphone, tablette portrait) : le segment (`radiogroup`, `:251`) en tête, `sousTitre` dessous à 8 px (`mt-2`), le `mt-3` actuel du segment (`!deuxVolets && "mt-3"`) retiré puisqu'il n'a plus rien au-dessus ; deux volets (`deuxVolets`, ordinateur et tablette paysage) : segment à gauche et phrase à sa droite sur la même ligne (`flex flex-wrap items-center gap-x-4`, déjà posé sur la section).
  - Supprimer l'import `Check` et `Minus` de lucide-react (`:20`) s'ils ne servent plus ailleurs dans le fichier (`grep` : seulement `:243-244` aujourd'hui).
  - Le segment reste désactivé (`disabled={!cochable}`, `opacity-50` sur les non choisis, `:260-262`) quand on ne peut pas cocher : déjà en place, ne pas y toucher.
  - Aucune clé de langue nouvelle ; `taches.etat.*` reste utilisée par les boutons du segment ; `taches.commenceePar` / `taches.faitePar` inchangés.
- Critères : la carte d'état ne contient plus que le segment et, s'il existe, la phrase (« En cours depuis 2 jours · Commencée par … », « Faite par … » ; 进行中 2 天 · … 已开始 en chinois) ; plus de rond ni de libellé gras ; au téléphone environ 60 px CSS gagnés, la carte « Échéance » remonte ; en deux volets segment à gauche, phrase à droite sur une ligne ; état « à faire » : segment seul, sans phrase. Cinq dispositions ; fr et zh identiques ; clair et sombre.
- Test : adapter `tests/taches.spec.ts` (trois appareils) et `tests/pages-en-grand-taches.spec.ts` (grand écran) : plus de texte d'état en gras hors du segment (`getByText("À faire")` ne trouve que le radio) ; la phrase « Faite par … » visible pour une tâche terminée, absente pour une tâche à faire ; segment 待办 / 进行中 / 已完成 en zh. La planche n'a vu ni fiche « en cours » ni « terminée » : les construire dans les données de test.
- Points de vigilance de la planche : l'état « terminée » perd son signe fort (le rond noir coché) ; seuls le segment (« Terminée » sur fond clair) et la phrase « Faite par … » le disent : à regarder sur une vraie fiche terminée avant de livrer. La fiche du Back-Office passe par le même composant.

### equipes-app-4 · L'équipe dessinée de deux façons selon la disposition
- Tranche : T1
- Décision : B, le texte gris sous le titre partout ; la pastille disparaît. La planche s'écarte ici de la correction du constat (la pastille) : l'en-tête du site dit déjà le contexte en sous-titre gris partout.
- À faire :
  - `src/components/taches/FicheTache.tsx:224` (`{badgeEquipe}` dans le `<header>` à deux volets) : supprimer, ainsi que la constante `badgeEquipe` (`:202-204`).
  - `FicheTache.tsx:226` : le h2 perd son `mt-2` ; dessous, à 4 px (`mt-1`), `<p className="text-sm text-muted-foreground">{nomEquipe}</p>` (14 px gris, comme le `sousTitre` d'`EnTetePage`). Le h2 garde `text-2xl font-bold leading-tight tracking-tight text-balance`.
  - Le cas à un volet (`:215-219`, `sousTitre={nomEquipe}`) ne change pas.
  - Aucune clé de langue (`cleNomEquipe`, `FicheTache.tsx:201`).
  - Fichiers de la planche : `FicheTache.tsx:200-203` et `:217` ; les numéros sont à ajuster comme ci-dessus (l'état courant est `:202-204`, `:218`).
- Critères : au téléphone et en tablette portrait, texte gris sous le titre (inchangé) ; à l'ordinateur et en tablette paysage (fiche à deux volets, colonne de 528 px), « DA » / « 美工组 » en 14 px gris sous le h2, plus de pastille grise au-dessus ; le titre redevient la première chose lue. La fiche du Back-Office change de même (à regarder). Français, chinois ; clair, sombre ; 1 440 px.
- Test : adapter `tests/pages-en-grand-taches.spec.ts` (grand écran) : le nom d'équipe est un `<p>` situé après le h2 de la fiche, pas dans un `span.rounded-full` ; adapter `tests/taches.spec.ts` si un test cherche la pastille. Vérifier le Back-Office : `tests/pages-en-grand-back-office-*.spec.ts` ou équivalent qui ouvre une fiche de tâche (`grep -l "FicheTache\|taches/" tests/*.spec.ts`).
- Points de vigilance de la planche : en grand l'équipe se voit un peu moins ; la fiche du Back-Office change aussi. Si la pastille venait d'une décision de la planche du Back-Office (B1/B2), c'est à confirmer au passage (vérifier `docs/spec-corrections-design/back-office.md`). La piste C (lien vers `/equipes/<id>`) est écartée : on ne sait pas si un membre peut ouvrir la page d'une équipe dont il n'est pas.

### equipes-app-5 · Titre de tâche qui laisse un mot seul sur la seconde ligne
- Tranche : T1
- Décision : A, `text-wrap: balance` sur `.titre-page` (B, `pretty`, ignoré par Firefox ; C, `text-balance` sur la seule fiche, une exception de plus dans un composant partagé).
- À faire :
  - `src/app/globals.css:820` : ajouter `text-wrap: balance;` à la règle `.titre-page` (24/30 px, puis 30/36 px à partir de 768 px, `:821-823`). Aucun changement de composant : le h1 est `src/components/layout/EnTetePage.tsx:67`.
  - Le h2 en grand de `FicheTache.tsx:226` a déjà `text-balance`.
  - Aucune clé de langue.
- Critères : les titres sur deux lignes ou plus se répartissent à parts à peu près égales, dans les deux langues ; ceux sur une ligne ne bougent pas. Sur la tâche de la planche : « Préparer les / affiches de Noël » à 412 et à 390 px, fr et zh (le bouton 编辑, plus étroit que Modifier, ne laisse plus « Noël » seul). Quatre dispositions plus 1 440 px : regarder les pages au titre long (évènements, setlists, chants, tâches, équipes) ; la première ligne raccourcit, plus de blanc à droite à côté des outils : à juger sur les captures.
- Test : adapter `tests/taches.spec.ts` : titre de la fiche à 390 px en zh, aucune ligne du titre ne contient un seul mot (mesure des rectangles de ligne via `Range.getClientRects`, ou `getComputedStyle(h1).textWrap === "balance"`). Faire en outre une passe de captures des titres longs sur les cinq projets.
- Points de vigilance de la planche : les coupes viennent de Chromium avec la police du site ; WebKit est écarté des tests : la coupe est à revoir sous Safari (iPhone) et sous SF / Segoe avant de livrer (question de la planche, proposition : oui). Le corps 24/30 n'est pas en cause (chantier 4).

### equipes-app-6 · Tablette portrait : la carte « Les tâches des équipes » est repoussée dans une colonne étroite
- Tranche : T1
- Décision : A, empiler comme au téléphone, la carte sous la liste en pleine largeur (B, ligne dans la carte de la liste ; C, deux volets en portrait, décision de navigation du chantier grand écran, hors lot).
- À faire :
  - `src/components/taches/SectionTaches.tsx:86` : supprimer la grille propre à la tablette, soit `disposition === "tablette" && versBackOffice && "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-5 space-y-0"`, pour ne garder que `"space-y-6"`. La carte « Les tâches des équipes · Back-Office » vient alors sous « À faire pour moi », pleine largeur (≈ 730 px à 820 px), à 24 px (`space-y-6`), libellé sur une ligne, « Back-Office » et chevron à droite.
  - Vérifier que `versBackOffice` (`:78`) et `useDisposition` servent encore ailleurs dans le fichier ; sinon retirer l'import ou la variable orpheline. `disposition` est encore lu aux lignes `:76`, `:81` et `:87`.
  - Aucune clé de langue.
- Critères : à 820 px (tablette portrait) fr et zh : la carte du Back-Office sous la liste, pleine largeur, libellé « Les tâches des équipes » / « 各团队的任务 » sur une ligne ; plus de vide à droite de la carte ; ordre identique à celui du téléphone. Aucun changement au téléphone, en tablette paysage, ordinateur et 1 440 px (là, la carte reste dans le volet de gauche). Clair, sombre.
- Test : adapter `tests/pages-en-grand-taches.spec.ts` (ou `tests/taches.spec.ts` sur le projet tablette) : à 820 px, la carte « Les tâches des équipes » a la même largeur que « À faire pour moi » et se trouve sous elle (`boundingBox().y` plus grand, `x` égal).
- Points de vigilance de la planche : deux cartes pleine largeur pour deux tâches, la page reste à moitié vide (c'est l'état réel, pas un trou de mise en page) ; la même question « tablette portrait = téléphone ou grand écran ? » se reposera sur d'autres pages : une règle générale vaudrait mieux qu'un cas par cas (à signaler à la conversation principale). Cette page relève aussi du chantier 2 (cartes `raised`, T2) et du chantier 4 (« À faire pour moi » en 13 px, T4) : ne pas y toucher ici.
