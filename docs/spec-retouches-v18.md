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

### V18RA (lot R, voie A) — 08/10/2026

- **R1-R2 codées** (fiche d'un évènement de l'App) :
  - **R1** : « Partager » / 分享. En grand, à droite du titre, à côté de « Gérer dans le Back-Office ». Sur téléphone et tablette debout, dans la barre de la fiche : rond sous 640 px, avec son libellé au-delà. Au doigt (`pointer: coarse`), la feuille de partage du système quand elle existe. À la souris, ou sans feuille de partage, le lien est copié et le bouton affiche « Lien copié » / 链接已复制 pendant 2,5 s (`role="status"`). Pas de bouton sur la fiche de gestion du Back-Office : la planche `v18-bo-evenement-fiche-b` ne l'y montre pas.
  - **R2** : en grand, Date · Heure · Lieu, chacune sous son libellé. Elles passent en trois colonnes dès que la carte des infos fait au moins 440 px (requête de conteneur `.infos-fiche`, `globals.css`). Sinon elles restent l'une sous l'autre. Sur téléphone et tablette debout, la carte ne change pas. La valeur est en graisse moyenne : la règle « la date n'est pas en gras » d'`evenements.spec.ts` est gardée.
- **Choix faits faute de réponse dans la spec** :
  - **Le seuil n'est pas celui du texte de R2.** R2 demande trois colonnes « dès que le volet dépasse 760 px ». Au-delà de 760 px, pourtant, la fiche est sur deux colonnes (A10, R15) et les infos sont dans la colonne de 300 px. La planche `-reduite` les y montre l'une sous l'autre. Les trois colonnes de la planche `v18-app-evenements` sont dessinées sur un volet de 728 px. D2 les demande sur ordinateur et sur iPad couché, dont les volets font moins de 760 px. J'ai donc suivi D2 et les planches : trois colonnes quand la carte a la place, donc quand la fiche est sur une colonne.
  - **Feuille de partage au doigt seulement**, pour respecter D1 (« Lien copié » sur ordinateur). Safari et Chrome sur Mac ont aussi `navigator.share`.
  - **Fichier de test `tests/retouches-v18-ra.spec.ts`** et non `retouches-v18.spec.ts`, pour ne pas entrer en conflit avec les autres voies du lot R. Il est ajouté à `SPECS_GRAND_ECRAN` par le motif `retouches-v18(-[a-z]+)?`.
- **Tests** : `tests/retouches-v18-ra.spec.ts`, sur les cinq projets, vus rouges puis verts (26 réussis, 19 sautés selon l'appareil). Les specs voisines (`agencement-v18-t7`, `pages-en-grand-evenements`, `evenements`, `evenements-2027`, `taches-evenements`, `reunions`) sont vertes sur ordinateur.
- **R3 codée** (`DeuxVolets`, D3) : la liste-carte tient dans la fenêtre. Son bas reste à 24 px du bas de la fenêtre quel que soit le défilement. Avant tout défilement, sous l'en-tête, elle est plus courte. Collée sous la barre du haut, elle a la hauteur de la fenêtre moins cette barre (moins 20 px au-dessus et 24 px en dessous). Elle défile seule : la molette sur la liste ne fait pas bouger la page. Sa hauteur suit son haut dans la fenêtre (`--haut-liste`, relu à l'image suivante au défilement, au redimensionnement et quand la page change de taille). Un volet (téléphone, tablette debout) : rien ne change.
  - **Pages vérifiées** sur ordinateur, ordinateur-1440 et iPad couché (captures regardées) : Setlists, Mes services, Tâches (App et Back-Office), Réunions, Évènements (App et Back-Office), Personnes, Réception, Harmonie. La scène (Pâques · Noël) et le Questionnaire passent par le même composant.
  - **Choix** : la page Chants n'est pas touchée. Sa liste n'est pas `DeuxVolets` (`.chants-volets`, `globals.css`), et R3 ne la cite pas. Elle a toujours le défaut de D3 : sa carte finit sous le bas de la fenêtre avant tout défilement. **À trancher par Timothée** : appliquer la même règle à Chants.
  - **Vu en passant, pas corrigé** : sur Harmonie › Fiches en grand, une bande vide d'environ 50 px en haut de la carte (marge du contenu de la liste, `Catalogue.tsx`), sans rapport avec R3.
- **Tests R3** : `tests/retouches-v18-ra.spec.ts`, describe « R3 ». Une vingtaine de lignes simulées par page. Les dix pages ont été vues rouges sur ordinateur (bas de la carte 36 à 114 px sous le bas de la fenêtre), puis vertes sur les cinq projets. Le test « un volet » est un garde-fou sur téléphone et tablette. Specs voisines vertes sur ordinateur, ordinateur-1440 et tablette-paysage (983 réussis) : `agencement-barre-reduite`, `agencement-v18-{harmonie,setlists,t2b,fondations,taches,regles,t7,t5}`, `pages-en-grand-{reception,evenements,mes-services,taches,harmonie,setlists}`, `scene-paques-noel`. `tsc --noEmit` et eslint sans erreur.
- **R7 codée** (accueil et libellés) :
  - **D14** : les heures sur « Ce dimanche », comme sur les planches `v18-app-planning-accueil` et `-reduite`. « Culte Franco 10:30 » (l'heure en gris à côté du titre), « Groupes · 13:00 », « EDD · 13:00 ». Pour la Table : « Table · 10:00 » en en-tête quand elle est sur deux étages (barre réduite, en grand), sinon « 10:00 » en gris au bout de la ligne « Prépa. Table ». Les heures sont des constantes de `CeDimanche.tsx` (`HEURES`), sans traduction.
  - **D15** : « un dimanche par mois » retiré de la carte Prépa. Table du Seigneur (`planning/table/page.tsx`). La clé `planning.table.unDimancheParMois`, devenue orpheline, est retirée des deux langues.
  - **D18** : `songs.list.proposer` = 推荐新诗歌. C'était la seule occurrence de 推荐诗歌 ; le lien du bas de liste sur téléphone le disait déjà.
- **R9 faite** (`spec-agencement-v18.md`) : D4, D16, D17, D19, D21 sont dans « Hors périmètre ». La phrase de B14 est corrigée (D13) : « la colonne la moins haute, large comprise ».
- **Choix faits faute de réponse dans la spec (R7)** :
  - **Pas d'heure sur les cartes Interfranco / Intergroupe**, qui remplacent Groupes ces dimanches-là : D14 ne les cite pas.
  - **L'heure de la Table au bout de la ligne** quand la Table n'a pas d'en-tête (barre dépliée, tablette, téléphone). La planche barre dépliée ne la montre pas, mais D14 la demande.
- **Tests R7** : `tests/retouches-v18-ra.spec.ts`, describe « R7 », sur les cinq projets. Les tests ont été vus rouges sur ordinateur et téléphone : pas d'heure dans les en-têtes, « un dimanche par mois » encore là, 推荐诗歌 en grand. Ils sont ensuite verts : 21 réussis, 4 sautés selon l'appareil. Captures regardées : ordinateur, ordinateur-1440 (barre dépliée et réduite), tablette, iPad couché, téléphone.
  - Specs mises à jour : `agencement-v18-planning` (la mention est absente), `nouveaux-membres` (推荐新诗歌 exact), `planning-accueil` (en-tête « Groupes · 13:00 »).
  - Specs voisines vertes (319 réussis) : `agencement-v18-planning`, `nouveaux-membres`, `planning-accueil`, `pages-en-grand-accueil`, `planning-table`, `libelles-langues`, `tableau-de-bord`. `tsc --noEmit` et eslint sans erreur.
- **Reste à la voie A** : rien (R1, R2, R3, R7, R9 faites).
- **À faire par Timothée** :
  - relire le 中文 : 分享, 链接已复制, 日期 · 时间 · 地点, 推荐新诗歌 ;
  - trancher Chants (ci-dessus).
  
  Aucune règle Firestore n'est touchée.
