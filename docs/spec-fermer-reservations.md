# Spec — fermer les réservations d'une fête avant la date de fin

- **Origine** : Timothée, 18/10/2026 : « j'ai lancé les réservations, mais j'arrive plus à fermer les réservations
  pour noël » ; « il faudrait donner la possibilité de fermer les réservations pour noël avant la date de fin ».
- **Statut** : questions tranchées le 18/10/2026 (FR1 à FR4) ; **FR-A codée le 18/10/2026, à valider par Timothée**.
- **Base de code** : `ui/apple-design` à `2046396a`.
- Lève en partie le « Demander avant » de `docs/spec-scene-paques-noel.md` (« repasser une saison lancée en
  brouillon ») : on ne repasse pas en brouillon, on **ferme**, et on peut rouvrir.

## Ce que le code fait aujourd'hui

- Une édition lancée se ferme seulement par la date : `etatEdition` (`src/lib/scene/fetes.ts:109-116`) rend `bientot`
  avant `debut`, `ouvertes` jusqu'à `fin` (`reservationsClosed`, `src/lib/scene/dimanches.ts:36-38`), puis `fermees`
  jusqu'au jour J, puis `passee`.
- Avancer `fin` ne ferme pas une édition **pas encore ouverte** : `bientot` est testé avant la fermeture
  (`fetes.ts:113`). C'est le cas de Noël 2026 (lancée, ouverture le 02/11).
- Au Back-Office, une fois lancée, la vue Saison affiche le texte « Réservations lancées » à la place du bouton
  (`src/app/back-office/evenements/scene/FeteGestion.tsx`, `vueSaison`) ; aucune action ne revient en arrière.
- Les règles ne vérifient que `ouvert` (`firestore.rules:232-236`, `reservable()`) : les dates ne sont tenues que par le
  navigateur.

## Décisions (18/10/2026)

| # | Question | Réponse de Timothée |
|---|---|---|
| FR1 | Rouvrir après une fermeture à la main ? | **Oui** : « Rouvrir les réservations » ; les dates prévues reviennent telles quelles. |
| FR2 | Les réservations déjà prises ? | **Gardées** : visibles des membres ; on ne peut plus en prendre ni en modifier ; la coordination peut toujours les retirer. |
| FR3 | Ce que voient les membres ? | **« Les réservations sont fermées. »** : le même état qu'après la date de fin (page visible, ordre de passage, pas de grille). |
| FR4 | Bloquer aussi côté serveur ? | **Oui** : `reservable()` refuse une édition fermée. Règle à publier par Timothée. |

## Modèle

`Programme` (`src/types/programme.ts`) gagne **`fermees?: boolean`** : `true` = réservations fermées à la main ;
absent ou `false` = l'état suit les dates, comme aujourd'hui. Les dates `debut` et `fin` ne sont **pas** touchées
(FR1 : rouvrir les retrouve). **Choix** : un champ à part plutôt que réécrire `fin`, qui ne marcherait pas avant
l'ouverture (ci-dessus).

## Règles (FR)

| # | Règle |
|---|---|
| FR5 | `etatEdition` : après `brouillon` et **avant** `bientot`, une édition `fermees === true` rend `fermees` si `today <= jourJ`, sinon `passee`. Une édition en brouillon reste `brouillon`, même avec `fermees`. |
| FR6 | **Back-Office, vue Saison** d'une édition lancée, avant le jour J compris : le texte « Réservations lancées » devient un bouton contour **« Fermer les réservations »** (même place, même taille que « Lancer » : en en-tête dès deux volets, pleine largeur sous la saison sur une colonne). Il demande confirmation par la confirmation du site (`useConfirmer`) : « Fermer les réservations de Noël 2026 ? Les créneaux déjà pris restent ; plus personne ne peut réserver. » — « Fermer » / « Annuler ». Puis un `PATCH` de `fermees: true` seul (`updateProgramme`, `updateMask`). |
| FR7 | Édition fermée à la main : le bouton devient **« Rouvrir les réservations »** (contour, sans confirmation), `PATCH` de `fermees: false` ; l'état revient à ce que disent les dates (`bientot`, `ouvertes` ou `fermees` si `fin` est passée). Après le jour J : ni l'un ni l'autre (l'édition est passée). |
| FR8 | La pastille d'état (Back-Office et App) dit « Fermées » comme après la date de fin ; la colonne garde « Toutes les réservations » et les semaines, en lecture pour les membres comme aujourd'hui en `fermees`. Les réglages de la saison restent modifiables. |
| FR9 | **App** : rien de nouveau ; l'état `fermees` montre déjà « Les réservations sont fermées. » et « Rendez-vous le jour J, dans l'ordre de passage. » (`FeteClient.tsx:161`). La saisie des chants et des musiques (`docs/spec-chants-fetes.md`) n'est pas touchée : elle suit le jour J, pas les réservations. |
| FR10 | **Règles** : `reservable()` ajoute `&& p.get('fermees', false) != true`. Création et modification d'un créneau par un membre sont refusées sur une édition fermée ; la coordination passe toujours (`isCoordination()`), et un membre peut toujours **supprimer** le sien (règle `delete` inchangée, comme après la date de fin). |
| FR11 | Pas de notification aux membres, ni à la fermeture ni à la réouverture. |
| FR12 | Pâques et Noël : le même écran, la même règle. |

## Libellés (FR · 中文, 中文 à relire par Timothée)

| Clé | FR | 中文 |
|---|---|---|
| `planning.gestion.fermer` | Fermer les réservations | 关闭预约 |
| `planning.gestion.rouvrir` | Rouvrir les réservations | 重新开放预约 |
| `planning.gestion.fermerConfirmTitre` | Fermer les réservations de {{edition}} ? | 关闭{{edition}}的预约？ |
| `planning.gestion.fermerConfirmTexte` | Les créneaux déjà pris restent ; plus personne ne peut réserver. | 已预约的时段保留；之后无人可再预约。 |
| `planning.gestion.fermerConfirmer` | Fermer | 关闭 |

`planning.gestion.lancees` (« Réservations lancées ») n'a plus d'emploi : à retirer avec ses deux langues.

## Tranche de code (une seule, FR-A)

`fermees` dans le type, `etatEdition` (FR5), bouton Fermer / Rouvrir et confirmation (FR6, FR7), libellés,
`firestore.rules` (FR10). Pas de planche : un bouton à la place d'un texte, au gabarit de « Lancer » ; capture des
quatre dispositions pour la relecture.

## Tests Playwright à écrire d'abord

Trois appareils ; la vue Saison est une spec d'agencement : à ajouter à `SPECS_GRAND_ECRAN` si la spec de test est
nouvelle (sinon dans `tests/scene-paques-noel.spec.ts`, déjà sur les cinq projets s'il y est).

- Logique pure : `etatEdition` avec `fermees` avant `debut` → `fermees` ; pendant → `fermees` ; après le jour J →
  `passee` ; en brouillon → `brouillon` ; `fermees: false` → l'état des dates.
- Back-Office : édition lancée (`bientot`) → « Fermer les réservations » → confirmation → `PATCH` de `fermees` seul
  (lu dans `db.writes` après « Rouvrir les réservations » visible), pastille « Fermées » ; « Rouvrir » → `fermees:
  false`, pastille « Lancée ». « Annuler » dans la confirmation n'écrit rien.
- App : édition `ouvertes` par les dates mais `fermees: true` → « Les réservations sont fermées. », pas de grille ;
  « Saisir les chants » toujours là pour un ayant droit.
- Après le jour J : ni Fermer ni Rouvrir.

## À la mise en ligne

- **`firestore.rules` à publier par Timothée** (FR10), avec ou après les règles de `docs/spec-chants-fetes.md`.
- En ligne, la scène est derrière l'interrupteur du back-office : rien ne change pour les membres avant la mise en
  ligne des Évènements.

## Hors périmètre

Repasser une édition lancée en brouillon ; supprimer une édition ; fermer une seule semaine ou un seul jour ; prévenir
les membres.

## Avancement

- 18/10/2026 : spec écrite, FR1 à FR4 tranchées ; attend le go.
- 18/10/2026 : go de Timothée, **FR-A codée** sur `ui/apple-design`.
  - Codé : `fermees?: boolean` sur `Programme`, lu par `fromFsProgramme` (`src/lib/firebase/programmes.ts`) ;
    `etatEdition` (FR5) ; vue Saison, « Fermer les réservations » (contour, confirmation du site) et « Rouvrir les
    réservations » (sans confirmation) à la place du texte « Réservations lancées », jusqu'au jour J compris (FR6,
    FR7) ; `reservable()` (FR10) ; libellés FR et 中文, `planning.gestion.lancees` retiré.
  - Écarts et choix faits faute de réponse :
    - le `PATCH` porte `fermees` avec `modifiePar` et `updatedAt`, que toute écriture du Back-Office signe déjà
      (comme « Lancer ») ; `debut`, `fin` et `ouvert` ne sont jamais dans le masque ;
    - miroir client : `canReserverPour` (`src/lib/access.ts`) refuse aussi une édition `fermees` (règle de CLAUDE.md :
      toute permission en double) ;
    - icônes cadenas fermé / ouvert sur les deux boutons (« Lancer » a la sienne) ;
    - sur deux volets, quand le volet droit est étroit (ordinateur 1 280 px, tablette couchée), le bouton passe sous le
      titre, dans l'en-tête, comme « Lancer » au même endroit ; à droite du titre à 1 440 px.
  - Tests : `tests/fermer-reservations.spec.ts` (ajoutée à `SPECS_GRAND_ECRAN`, cinq projets) ; les tests qui
    attendaient « Réservations lancées » attendent désormais le bouton « Fermer les réservations ».
  - Restent à Timothée : **publier `firestore.rules`** dans la console Firebase ; relire le 中文.
