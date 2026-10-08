# Spec — retouches après le chantier v18 (08/10/2026)

Trois lots, tranchés par Timothée le 08/10/2026 en réponse aux questions laissées par le chantier v18
(`spec-agencement-v18.md`, `spec-scene-paques-noel.md`, feuille de route § 3 V) :

- **Lot R — retouches d'agencement** : écarts à la planche v18 et petits réglages.
- **Lot E — évènements réservés à un pôle** : un évènement de pôle n'est plus forcément une réunion.
- **Lot F — Fidélité, un seul planning** : le planning des musiciens disparaît, ses colonnes passent dans le
  planning du groupe.

Rien n'est codé sans le go de Timothée. Règles communes : tests Playwright écrits avant le code et vus rouges, sur
les trois appareils (et les cinq projets pour les specs `agencement-v18-*`) ; FR et 中文 pour tout libellé nouveau
(中文 relu par Timothée) ; toute fonctionnalité de back-office reste derrière `BACK_OFFICE`.

## Décisions du 08/10/2026

| # | Question | Réponse de Timothée |
|---|---|---|
| D1 | Bouton « Partager » sur la fiche d'un évènement (App), dessiné sur la planche | **L'ajouter** : feuille de partage du système sur téléphone, « Lien copié » sur ordinateur |
| D2 | Infos de la fiche en trois colonnes Date · Heure · Lieu | **Trois colonnes en grand** (ordinateur, iPad couché), l'une sous l'autre sur téléphone |
| D3 | Liste en carte des deux volets qui dépasse le bas de la fenêtre | **Elle tient dans la fenêtre** et défile seule (R10) |
| D4 | « Ajouter » un inscrit à la main (BO › Évènements, carte Inscrits) | **S'en passer** : hors périmètre |
| D5 | Publics de pôle et d'équipe dans « Nouvel évènement » | **Les garder** : un évènement pour un pôle peut ne pas être une réunion → lot E |
| D6 | Calendrier, Agenda sur iPad debout : filtres sur trois rangées | **Une seule rangée qui défile**, bord fondu, comme les plannings |
| D7 | « Ajouter ce jour-là » et ligne choisie de l'agenda | **Suivre la planche** : un bouton et une flèche ronde ; la ligne de l'entrée ouverte surlignée |
| D8 | Badge des inscriptions dans Équipes › Personnes | **« n nouveaux comptes »** (comptes créés ces sept jours) — déjà codé |
| D9 | Taille des pilules de choix (`Pilules`) | **Compactes en grand (≈ 28 px), 40 px au doigt** (téléphone, tablette) |
| D10 | Plannings du Back-Office à 1 280 px | **Défilement de côté** avec bord fondu — déjà codé |
| D11 | Statistiques › « Les plus joués » entre 1 024 et 1 100 px, barre dépliée | **Les chiffres s'empilent au-dessus du tableau**, rien ne défile de côté |
| D12 | Statistiques › « En chinois » sur iPad debout | **Deux colonnes** — déjà codé |
| D13 | Répartition du tableau de bord | **Comme les planches** : chaque widget dans la colonne la moins haute, larges comprises — déjà codé ; corriger la phrase de B14 dans `spec-agencement-v18.md` |
| D14 | Heures sur l'accueil (carte « Ce dimanche ») | **Les afficher** : Culte Franco 10:30, Groupes 13:00, EDD 13:00, Table 10:00 |
| D15 | « un dimanche par mois » dans l'en-tête de la Prépa. Table | **Retirer la mention** |
| D16 | « Prénom ✕ » et « Mes dates » dans la Prépa. Table de l'App | **Laissés de côté** (écart à la planche consigné) |
| D17 | Lien « Tout voir › » de « Nouveaux au répertoire » | **Pas de lien** |
| D18 | 中文 du bouton de Chants | **推荐新诗歌 partout** (le bouton disait 推荐诗歌) |
| D19 | Thème (Chants) et catégorie (Setlists) en pilules | **Garder les menus déroulants** |
| D20 | Ordre de passage de la scène écrasé si deux responsables l'écrivent en même temps | **Protéger** : enregistrement refusé avec « Modifié par Prénom entre-temps : recharge » |
| D21 | « Une équipe » et « Un pôle » dans Notifier | **Pas maintenant** |
| D22 | Évènement de pôle : qui le voit | **Les membres du pôle seuls** (plus admins et coordination), avec un badge du pôle |
| D23 | Évènement de pôle : notification à la publication | **Oui, comme un évènement**, envoyée aux seuls membres du pôle ; rappel habituel aux inscrits |
| D24 | Colonnes du planning Fidélité | **Date · Présidence · Orateur · Thème · Pianiste · Guitariste · Batterie** ; Batterie facultative à l'export (cachée si vide), comme la percussion de Paix et Bonté |
| D25 | Noms déjà saisis dans le planning des musiciens | **Repris** dans Guitariste et Batterie |
| D26 | Pianiste différent entre les deux plannings | **Celui du planning du groupe fait foi** ; la liste des dimanches qui diffèrent est montrée à Timothée avant toute suppression |
| D27 | Google Sheet (en ligne, back-office coupé) | **L'app lit guitare et percussion dans l'onglet `Fidélité_Musicien`** et les affiche dans le planning Fidélité ; rien à changer dans le Sheet ; l'onglet « Musiciens » disparaît de l'app |

## Lot R — retouches d'agencement

| Tranche | Ce qui change | Où |
|---|---|---|
| R1 | « Partager » à droite du titre de la fiche d'évènement (D1) : `navigator.share` quand il existe, sinon copie du lien et « Lien copié » ; libellés FR/中文 ; aussi sur la fiche de gestion du BO si la planche l'y montre | `src/app/evenements/[id]/EvenementClient.tsx` |
| R2 | Date · Heure · Lieu en trois colonnes dès que le volet de la fiche dépasse 760 px (requête de conteneur, comme R15), l'une sous l'autre en dessous (D2) | même fichier |
| R3 | `DeuxVolets` : la liste-carte a la hauteur de la fenêtre moins la barre du haut, collante, et défile seule (D3) ; vérifier Setlists, Mes services, Tâches, Réunions, Évènements, Personnes, Réception, Harmonie | `src/components/layout/DeuxVolets.tsx` |
| R4 | Agenda du Calendrier : la rangée des filtres reste sur une ligne et défile de côté avec bord fondu (D6) ; « Ajouter ce jour-là » en bouton + flèche ronde, la ligne de l'entrée ouverte surlignée (D7) | `src/components/calendrier/Agenda.tsx`, `src/app/back-office/calendrier/CalendrierClient.tsx` |
| R5 | `Pilules` : ≈ 28 px dès 1 024 px de large avec un pointeur fin, 40 px au doigt (D9) — une règle dans le composant commun, pas de variante par page | `src/components/layout/Onglets.tsx` |
| R6 | « Les plus joués » : sous ≈ 1 100 px de conteneur, les chiffres passent au-dessus du tableau (D11) | `src/app/back-office/statistiques/StatistiquesClient.tsx` |
| R7 | Heures sur la carte « Ce dimanche » (D14) ; mention « un dimanche par mois » retirée (D15) ; 中文 `songs.proposer` = 推荐新诗歌 (D18) | `src/components/accueil/CeDimanche.tsx`, `src/app/planning/table/page.tsx`, `src/locales/zh-CN.json` |
| R8 | Ordre de passage protégé (D20) : l'écriture REST porte la précondition `currentDocument.updateTime` du document lu ; en cas de conflit (HTTP 400 `FAILED_PRECONDITION`), message « Modifié par Prénom entre-temps : recharge » et rien n'est écrit | `src/app/evenements/scene/OrdrePassage.tsx`, `src/lib/firebase/programmes.ts` |
| R9 | Documentation : D4, D16, D17, D19, D21 dans « Hors périmètre » de `spec-agencement-v18.md` ; phrase de B14 corrigée (D13) | specs |

Tests : `tests/retouches-v18.spec.ts` (R1–R7), cinq projets ; R8 par deux contextes de navigateur qui enregistrent
l'un après l'autre sur la même version lue (le second voit le message, le document garde la première écriture).

## Lot E — évènements réservés à un pôle

Aujourd'hui, `estReunion(pour)` (`src/lib/access.ts`) range **tout** évènement dont le public est un pôle ou une
équipe parmi les réunions : sans inscriptions, avec sujets et compte rendu, listé dans Réunions. Le lot sépare les
deux.

| # | Règle |
|---|---|
| E1 | Un évènement porte `reunion: true` ou `false`. **Absent = comme avant** : une réunion si le public est un pôle ou une équipe (aucune donnée existante ne change). « + Nouvelle réunion » écrit `true` ; « Nouvel évènement » écrit `false`, quel que soit le public. |
| E2 | `estReunion` prend l'évènement (public et champ) au lieu du seul public ; tous les appelants suivent (cartes, fiche, listes du BO, création, rappels du cron). |
| E3 | Un évènement de pôle (`reunion: false`, public `pole:x`) se comporte comme un évènement de l'assemblée : inscriptions, période d'inscription, liste des inscrits, rappel aux inscrits. Il est listé dans BO › Évènements, pas dans Réunions. |
| E4 | Visibilité (D22) : dans l'App, seulement pour les membres du pôle, les admins et la coordination, avec un badge du pôle sur la carte et la fiche ; même règle pour une équipe. |
| E5 | Notification à la publication (D23) : aux seuls membres du pôle (ou de l'équipe), par la route existante des évènements. |
| E6 | Droits : `firestore.rules` permet déjà de créer avec un public de pôle ou d'équipe (`isTachePole`) ; vérifier la liste des champs permis à la création et à la mise à jour. Si `reunion` doit y être ajouté, double modification `access.ts` + `firestore.rules`, **publication par Timothée**. Vérifier aussi que `/api/evenements/inscription` accepte un évènement de pôle non-réunion pour un membre du pôle et le refuse aux autres. |

Tests : `tests/evenements-pole.spec.ts` — créer depuis « Nouvel évènement » pour un pôle → il est dans Évènements
(pas Réunions), un membre du pôle le voit et s'inscrit, un non-membre ne le voit pas ; une réunion créée depuis
« + Nouvelle réunion » reste une réunion ; un évènement ancien sans champ, public de pôle, reste une réunion.

## Lot F — Fidélité, un seul planning

| # | Règle |
|---|---|
| F1 | `GRILLE_FIDELITE` gagne `guitariste` et `batterie` après `pianiste` (D24). `GRILLE_FIDELITE_MUSICIENS` disparaît des pages et sélecteurs du Planning (App, Back-Office, ancien tableau : plus d'onglet « Musiciens »), de « Choisir », du tableau de bord et de la publication. |
| F2 | Lecture (D25, D27) : pour chaque dimanche, Guitariste et Batterie viennent du planning Fidélité s'ils y sont remplis, sinon du planning des musiciens (grille de l'app `fideliteMusiciens`, puis onglet `Fidélité_Musicien` du Sheet). Aucune migration écrite : les anciennes données restent lisibles là où elles sont ; une modification écrit dans le planning Fidélité. |
| F3 | Pianiste (D26) : celui du planning du groupe ; le piano du planning des musiciens n'est plus affiché. Avant la mise en ligne, un relevé des dimanches où les deux diffèrent est montré à Timothée (Sheet public lu en CSV ; la grille de l'app, en Firestore, par un script que Timothée lance lui-même). |
| F4 | Mes services, rappels du matin et recherche par nom (`names.ts`) trouvent les guitaristes et batteurs de Fidélité dans le planning Fidélité. |
| F5 | Export PDF / .xlsx : le modèle Fidélité a les deux colonnes (Batterie facultative), largeurs revues pour tenir en portrait ; le modèle `Fidélité_Musicien` est retiré. |

Tests : `tests/planning-fidelite.spec.ts` — colonnes et ordre, reprise d'une guitare et d'une percussion depuis le
planning des musiciens (grille et Sheet simulés), plus d'onglet « Musiciens », Mes services d'un guitariste de
Fidélité, export du modèle ; mise à jour des specs existantes qui citent les musiciens de Fidélité
(`planning-groupes-grille`, `planning-export-modele`, `planning-2027`, `agencement-v18-planning`, `back-office-admin`).

## Hors périmètre

« Ajouter » un inscrit à la main (D4) ; « Prénom ✕ » et « Mes dates » dans la Prépa. Table (D16) ; « Tout voir »
de « Nouveaux au répertoire » (D17) ; pilules pour le thème et la catégorie (D19) ; « Une équipe » et « Un pôle »
dans Notifier (D21) ; toute écriture dans le Google Sheet.

## Avancement

Rien de codé (spec écrite le 08/10/2026, en attente du go).

### V18RB

- **08/10/2026 — R4 codée** (Agenda du Calendrier, D6 et D7) :
  - D6 : en grand (dès 768 px), la rangée des filtres (sources, « Seulement moi ») reste sur une ligne à droite
    de la période et défile de côté, bord fondu du côté où il reste des filtres (`useFonduLateral` +
    `.fondu-lateral`, comme les plannings et les récents) ; la même rangée sert le Mois. Le téléphone garde
    « Tout · Seulement moi » et la feuille des sources.
  - D7 : « Ajouter ce jour-là » puis une flèche ronde (« Évènement, tâche ou réunion » / 活动、任务或会议) ;
    l'un et l'autre ouvrent le même menu du jour. La ligne de l'agenda touchée est surlignée (`aria-current`,
    fond `bg-secondary`) ; toucher la colonne d'un jour ou changer de mois retire le surlignage.
  - Fichiers : `src/app/back-office/calendrier/CalendrierClient.tsx`, `src/components/calendrier/Agenda.tsx`,
    `src/components/calendrier/PanneauJour.tsx` (`AjouterCeJour`), `src/locales/{fr,zh-CN}.json`
    (`calendrier.ajouterCeJourMenu`).
  - Tests : `tests/retouches-v18-agenda.spec.ts`, cinq projets (`/retouches-v18(-.*)?\.spec\.ts/` ajouté à
    `SPECS_GRAND_ECRAN`), vus rouges puis verts ; `agencement-v18-calendrier`, `calendrier`, `calendrier-deplacer`,
    `calendrier-widget` verts sur les cinq projets.
  - Reste : rien pour R4. Timothée : relire le 中文 `活动、任务或会议` ; aucune règle Firestore touchée.
- **08/10/2026 — R5-R6 codées** (D9 et D11) :
  - R5 (D9) : `Pilules` (`src/components/layout/Onglets.tsx`) suit une seule règle, selon l'appareil : 40 px et
    15 px au doigt (téléphone, tablette debout et couchée), ≈ 28 px, 13 px en gras dès 1 024 px de large avec un
    pointeur fin (planche `v18-bo-statistiques`), par une requête `(pointer: fine) and (min-width: 1024px)` dans
    le composant. La variante `compact` (32 px partout) disparaît : la rangée des plannings du Back-Office
    (`BarreDeGrille.tsx`) et Fidélité › Groupe · Musiciens (`planning/groupes/page.tsx`) suivent la règle
    commune, donc 40 px au doigt au lieu de 32.
  - R6 (D11) : Statistiques › « Les plus joués » (`StatistiquesClient.tsx`) : le corps de la page est un
    conteneur ; dès 1 100 px de conteneur (zone moins les marges), les chiffres à gauche comme sur la planche
    (1 440 px barre dépliée : 1 112 px) ; en dessous, les trois chiffres (Setlists comptées, Chants
    différents, Jamais joués) sur une rangée au-dessus des dix premiers et du tableau, qui ne défile plus de
    côté (1 024 à 1 100 px barre dépliée, 1 280 px barre dépliée, iPad couché). Sous 1 024 px de fenêtre,
    rien ne change (la carte des setlists comptées seule).
  - Tests : `tests/retouches-v18-pilules-stats.spec.ts`, cinq projets, vus rouges (40 et 32 px au lieu de 28,
    32 au lieu de 40 au doigt ; chiffres en colonne à 1 024–1 100 px) puis verts ; voisins verts sur
    ordinateur (`agencement-v18-fondations`, `-regles`, `-t2a`, `-planning`, `-t5`, `-t6`, `-calendrier`,
    `-harmonie`, `look-secondaires`, `statistiques`, `planning-groupes-grille`, `retouches-v18-agenda` sur
    les cinq), et `agencement-v18-planning`, `-t6`, `planning-groupes-grille` sur téléphone et tablettes.
  - Reste : rien pour R5-R6. Timothée : aucune règle Firestore touchée, aucun libellé nouveau. Les menus
    déroulants des Statistiques suivent la même règle depuis la relecture (voir plus bas) ; les sources du
    Calendrier (boutons propres, pas `Pilules`) gardent 32 px, à côté des boutons ronds de la période, comme
    sur la planche `v18-bo-calendrier-agenda-a`.
- **08/10/2026 — R8 codée** (ordre de passage protégé, D20) :
  - `updateProgramme(id, data, version)` (`src/lib/firebase/programmes.ts`) : avec `version` (l'`updateTime`
    du document lu, rangé dans `Programme.version`, jamais écrit), le PATCH porte
    `currentDocument.updateTime` ; un refus HTTP 400 `FAILED_PRECONDITION` lève `ModifieEntreTemps`, avec le
    prénom relu dans le document, et rien n'est écrit. Seul l'ordre de passage passe sa version
    (`FeteGestion.tsx`, `onSave` d'`OrdrePassage`) ; la saison et « Lancer » s'écrivent comme avant.
  - Chaque écriture de la coordination sur une édition signe du prénom (`modifiePar`, nouveau champ
    facultatif) : « Modifié par Alice entre-temps : recharge » / 已被 Alice 修改：请重新加载 ; sans prénom connu
    (document écrit avant ce lot), « Modifié entre-temps : recharge » / 已被他人修改：请重新加载. Le message prend
    la place des autres erreurs d'écriture de la page (colonne de la fête en grand, au-dessus de l'ordre sur
    une colonne) ; la liste reste celle lue, rien ne se recharge tout seul.
  - Base simulée des tests (`tests/helpers/fakeSession.ts`) : chaque document porte un `updateTime`, nouveau
    à chaque écriture ; un PATCH sur une autre version est refusé comme par Firestore ; `signInAs(…, partage)`
    fait lire et écrire deux contextes de navigateur dans la même base.
  - Tests : `tests/retouches-v18-ordre.spec.ts`, cinq projets, vus rouges (l'écriture de la seconde
    responsable passait et écrasait la première) puis verts : deux contextes enregistrent sur la même version
    lue, le second voit le message, le document garde la première écriture, puis rechargé il enregistre ; et
    en chinois. `scene-paques-noel`, `scene-saison`, `programme-scene` verts sur les trois appareils, après
    une retouche de sept assertions qui vérifiaient qu'une écriture de la saison ne porte que son champ
    (`["jourJ", "updatedAt"]`…) : elles admettent maintenant `modifiePar`, la signature, l'intention reste
    (ne jamais réécrire les autres réglages). `evenements` et `setlist-history` (base simulée) verts sur
    ordinateur.
  - Choix faute de réponse : une seconde modification faite par la même personne avant que la page ait relu
    la première est refusée aussi (avec son propre prénom) plutôt que d'écraser son premier changement. Une
    édition qui n'existe pas encore naît comme avant (`creerEdition`) ; depuis la relecture, si une autre
    coordination l'a créée entre-temps (409), l'ordre de passage est refusé de la même façon.
  - Reste : rien pour R8. Timothée : aucune règle Firestore à republier (la coordination écrit déjà tous
    les champs d'un programme, `modifiePar` compris) ; relire le 中文 `已被 {{prenom}} 修改：请重新加载` et
    `已被他人修改：请重新加载`.
- **08/10/2026 — relecture du lot (deux relectures, onze constats mineurs)** : lot R voie B fini et relu.
  - Corrigés, chacun avec un test vu rouge puis vert :
    - Statistiques : les menus Service, Langue, Présidence suivent la règle de `Pilules` (40 px au doigt,
      ≈ 28 px et 13 px dès 1 024 px avec un pointeur fin), à la hauteur des périodes comme sur la planche
      `v18-bo-statistiques`. À 1 024 px barre dépliée, la rangée passe encore sur deux lignes : elle est trop
      longue pour la place (environ 900 px de filtres pour 700 px), la planche est dessinée à 1 440 px.
    - Ordre de passage : refusé (D20), le formulaire du passage reste ouvert avec la saisie, pour la recopier
      avant de recharger (`OrdrePassage` : `onSave` rend `false` quand rien n'est écrit). Écrit mais relu
      sans succès (réseau) : le formulaire se ferme comme avant, avec le message d'erreur.
    - Ordre de passage sur une édition pas encore créée : si une autre coordination l'a créée entre-temps,
      `creerEdition(…, protege)` lève `ModifieEntreTemps` au lieu d'écraser `passages` par un PATCH sans
      précondition (le trou que D20 veut fermer).
    - Calendrier, « Ajouter ce jour-là » : retoucher le bouton referme le menu (il se rouvrait aussitôt) ;
      fermé, le focus revient à qui l'a ouvert, le bouton ou la flèche.
    - Calendrier, bord fondu des filtres : reposé quand la rangée renaît en sortant du téléphone (fenêtre
      élargie, téléphone tourné) et au changement de langue (clé `nombre de sources | téléphone | langue`).
      Le changement de langue était déjà rattrapé en pratique, la période changeant aussi de largeur : son
      test garde le comportement, il n'a pas pu être vu rouge.
    - `retouches-v18-ordre` vérifie la valeur de `modifiePar` (le prénom de qui a écrit) après chaque écriture.
  - Laissés, avec la raison :
    - Ligne surlignée de l'agenda qui ne suivrait pas `ouvrirEntree` : `ouvrirEntree` ne sert que sur
      téléphone (agenda à cartes, Mois à points), où l'agenda à lignes n'existe pas. En grand et sur iPad
      debout, une entrée ne s'ouvre qu'en touchant sa ligne ; les cartes du volet du jour sont des liens qui
      quittent la page. Le surlignage est donc celui de la ligne choisie : il reste après la fermeture de la
      feuille du jour (iPad debout) et part au choix d'un autre jour ou d'un autre mois.
    - Prénom du refus relu dans `modifiePar` : toute écriture d'un programme passe par `ecrire`, qui signe ;
      « Préparer » crée l'édition suivante sans prénom (refus alors « Modifié entre-temps : recharge »). Un
      prénom périmé supposerait un autre chemin d'écriture, qui n'existe pas.
    - Deux déplacements de l'ordre à la suite, avant la relecture de la page : le second est refusé avec son
      propre prénom (choix déjà consigné) ; rien n'est écrasé, il suffit de recharger.
    - Les sept assertions élargies de `scene-paques-noel` et `scene-saison` restent (elles admettent
      `modifiePar`) ; la valeur est vérifiée dans `retouches-v18-ordre`.
    - Barre des plannings du Back-Office à 40 px sur téléphone (32 px avant) : c'est D9 (40 px au doigt) ;
      capture regardée.
    - `playwright.config.ts` : chaque voie du lot R ajoute la même entrée `retouches-v18(-.*)?` à
      `SPECS_GRAND_ECRAN` ; à l'intégration, n'en garder qu'une.
  - Timothée : aucune règle Firestore à republier ; relire le 中文 déjà listé (`活动、任务或会议`,
    `已被 {{prenom}} 修改：请重新加载`, `已被他人修改：请重新加载`), aucun libellé nouveau à la relecture.
