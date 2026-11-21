# Spec — Occupation des salles (AR)

- **Origine** : retour rapporté par Timothée le 16/11/2026 : « Scène : Réfléchir à modifier (fusionner) cette
  fonctionnalité "scène" à une fonctionnalité plus globale "occupation des salles" (salle bonté, salle
  réunion/imprimante, salle à côté de réunion, scène etc), le but est de pouvoir renseigner les occupations des
  différentes salles à l'église afin de ne pas créer de doublon ou ne pas avoir d'endroit pour se réunir (à réfléchir) ».
- **Réponses de Timothée (16/11/2026)** : la liste des salles et leurs occupations du dimanche (ci-dessous) ; qui
  réserve : « Tout le monde je pense » ; « oui pour une réunion, un évènement, il faut réserver la salle » ; « Peut à
  la place de mettre des plages, laisser les personnes mettre le temps qu'ils veulent réserver ». Puis : « quand c'est
  un dimanche avec intergroupe toutes les salles sont disponibles de sur le temps de groupe qui est de 13h à 14h30.
  Quand c'est un dimanche avec interfranco la salle bonté et salle paix sont disponibles de 13h à 14h30 sauf la salle
  fidélité qui sera occupé par le groupe joie. » Puis : « la grande salle est occupé pour intergroupe par les 5
  groupes, et pour interfranco la grande salle est occupé par les 3 groupes francophones ».
- **Portée élargie (Timothée, 16/11/2026, en accordant la planche)** : « Oui, il faudrait peut être la fusionner avec
  la réservation de la scène. En fait il faudrait revoir tout le système de réservation ainsi que sa page. L'onglet
  évènement est à changer ? » La planche porte donc sur **tout le système de réservation, Scène comprise, et sa page**,
  et sur la place de l'onglet Évènements.
- **Statut** : **spec écrite le 16/11/2026** (§ « Décisions déléguées » à « Hors périmètre ») ; planche validée par
  Timothée le 16/11/2026 (« Église, je valide »), piste retenue en tête de `docs/planches/planche-salles-reservation.html`.
  **Attend le go de Timothée, lot par lot** (le « go pour coder » du 16/11 portait sur le lot AQ).
- **Base de code** : `claude/corrections-design` à `4f1134e`.

## Ce que le code montre

- **La Scène est déjà une salle** : des créneaux, un refus des chevauchements, un message aux deux auteurs si deux
  enregistrements se croisent (`src/lib/scene/`, `/api/scene/conflit`). Elle n'existe que pour une fête (Pâques, Noël)
  et pendant sa période de réservation ; « la scène est une seule salle » interdit même deux fêtes à la fois
  (`erreursSaison`, `autreFete`).
- **Aucune notion de salle ailleurs** : un évènement ou une réunion porte un `lieu` en texte libre (120 caractères),
  sans contrôle (`src/types/evenement.ts`, `EvenementForm`, `ReunionForm`). Le Sheet des évènements a une colonne
  « Lieu ».
- **Le Calendrier réunit déjà tout par jour** (services, évènements, réunions, tâches, créneaux de scène, petit déj,
  `src/lib/calendrier/entrees.ts`) : une vue par salle y lirait les mêmes sources.
- **Intergroupe et Interfranco** sont des dimanches connus de l'app (leurs dates sont dans la feuille du planning ;
  la section Groupes du planning est remplacée ce jour-là, `docs/intent/vision-site.md`). Ce que ça change pour les
  salles : S-Q4.

## Les salles (Timothée, 16/11/2026)

Une salle a parfois deux noms, selon qui l'occupe. Occupations fixes : **tous les dimanches**.

| Salle | Autre nom | Occupations du dimanche |
|---|---|---|
| Grande salle | | 8:30–10:30 entraînement de la louange du culte francophone ; 10:30–12:00 culte francophone ; 13:00–14:30 groupe Joie ; 15:00–17:00 culte sinophone |
| Salle Fidélité | Salle 小班 | 13:00–14:30 ; 15:30–17:00 (小班) |
| Salle Paix | Salle 高班 | 13:00–14:30 ; 15:30–17:00 (高班) |
| Salle Amour | Salle 大班 | 13:00–14:30 ; 15:30–17:00 (大班) |
| Salle Bonté | | 13:00–14:30 |
| Salle 中班 | aucun : une salle à part | 15:30–17:00 |
| Salle imprimante | | 12:20–12:40, l'équipe de louange du culte francophone du jour |
| Salle de réunion | | aucune ; c'est une autre salle que la Salle imprimante |
| Scène | **dans la Grande salle** | réservations des fêtes (aujourd'hui) ; aucun entraînement sur scène pendant le culte sinophone ni pendant le groupe Joie |

**Conséquence pour la Scène d'aujourd'hui** : la grille par défaut d'une saison (dimanche 14:00–19:00, créneaux d'une
heure) propose des créneaux qui croisent le groupe Joie (jusqu'à 14:30) et le culte sinophone (15:00–17:00). Le
dimanche, la scène n'est vraiment libre qu'entre 14:30 et 15:00, puis après 17:00 : d'où le besoin d'autres jours.

### Le temps de groupe (13:00–14:30) selon le dimanche (Timothée, 16/11/2026)

L'app connaît déjà les dimanches d'Intergroupe et d'Interfranco (feuille du planning) : l'emploi du temps peut donc
changer tout seul ces jours-là, sans exception à saisir.

| Salle | Dimanche ordinaire | Intergroupe | Interfranco |
|---|---|---|---|
| Salle Fidélité | occupée | libre | groupe Joie |
| Salle Bonté | occupée | libre | libre |
| Salle Paix | occupée | libre | libre |
| Salle Amour | occupée | libre | occupée par le groupe Amour (confirmé) |
| Grande salle | groupe Joie | Intergroupe : les cinq groupes | Interfranco : les trois groupes francophones |

## Décisions (16/11/2026)

| # | Décision | D'où |
|---|---|---|
| AR1 | **Piste retenue : A, avec la grille de B en deuxième vue.** Salles a deux vues, « Liste · Grille » : la liste des salles avec l'état en mots et un ruban (A), la grille salles × heures (B). | Timothée : « J'aime beaucoup la piste A, j'aime beaucoup le calendrier de la piste B pour avoir un aperçu global des réservations » ; « je valide » (planche, section « Piste retenue »). |
| AR2 | L'entrée de la barre s'appelle **« Église »** (icône d'église), sous-titre « Évènements, salles et fêtes » ; rail **« Évènements · Salles · Pâques · Noël »** (« Évènements » remplace « Calendrier »). Les adresses ne changent pas (`/evenements/…`). | Timothée : « il y a plusieurs choses de mélange dedans » ; « Église, je valide ». |
| AR3 | Liste par défaut au téléphone, Grille par défaut à la tablette en paysage et à l'ordinateur ; le choix est retenu sur l'appareil. | Validé avec la planche. |
| AR4 | Tout membre connecté réserve ; date, « de », « à » libres, pas de créneaux imposés ; un chevauchement est refusé. | Timothée. |
| AR5 | Une réunion ou un évènement réserve sa salle. | Timothée. |
| AR6 | La Scène est dans la Grande salle : ce qui occupe l'une occupe l'autre. | Timothée. |
| AR7 | Les salles, leurs deux noms, l'emploi du temps du dimanche et ses trois variantes : tableaux ci-dessus. | Timothée. |
| AR8 | De la piste C : la feuille « Réserver » commence par le moment puis propose les salles libres en tête, les occupées non choisissables avec leur raison et « Décaler » ; la page d'une fête montre quand la scène est libre. | Recommandation annoncée à Timothée avec la planche, validée avec elle. |
| AR9 | **Propositions retenues sans objection** (annoncées à Timothée le 16/11 : « je garde les propositions suivantes ») : la Scène bascule dans Salles **après Noël 2026**, et d'ici là Salles lit ses créneaux en lecture seule ; neuf lignes (huit salles et la Scène), la « salle à côté de réunion » tenue pour la Salle imprimante ; noms de salles en français dans les deux langues, sauf 小班, 中班, 大班, 高班 ; Salles invisible sans compte ; « Pour qui » en liste avec « Autre… » ; champ « Salle de l'église » (et « Ailleurs ») dans les formulaires ; réservations répétées par un membre : plus tard. | Planche, « Questions à trancher » et « Reste à trancher ». Décision déléguée, à corriger par Timothée. |

Les autres propositions de la section « Questions à trancher » de la planche (jour J d'une fête, saisie de l'emploi
du temps en un modèle à trois variantes avec exceptions datées, repère « à 14:00 », couleurs) se tranchent en écrivant
les règles, selon la proposition écrite (« décision déléguée »), sauf si le choix est difficile à défaire.

## Reprise (faite le 16/11/2026 : la suite est écrite plus bas)

1. Lire ce fichier, la section « Piste retenue » de la planche (ouvrir ses quatre cadres par capture d'élément, pas la
   pleine page) et, par extraits, `src/lib/scene/saison.ts`, `src/types/programme.ts`, `firestore.rules` (`programmes`),
   `src/lib/calendrier/entrees.ts`, `src/lib/navigation.ts`, `src/components/evenements/EvenementsTabs.tsx`.
2. Écrire ici : modèle (salles et emploi du temps dans le code ou en base ; collection des réservations en REST),
   règles numérotées, permissions en double (`access.ts`, `firestore.rules`), libellés FR et 中文, tranches et tests
   Playwright (cinq projets pour l'agencement), ce qui se fait à la mise en ligne.
3. Découper selon « Lots pressentis » ; le renommage de l'entrée (« Église », rail) peut être une première petite
   tranche. Le lot de la Scène attend la fin de la saison de Noël (AR9).
4. Demander le go à Timothée, lot par lot. Le lot AQ (`docs/spec-scene-qui-autre-moment.md`) se code en parallèle
   dans `src/app/evenements/scene/` : ne pas y toucher avant sa fin.

## Principes proposés (repris par les décisions ci-dessus)

| # | Principe |
|---|---|
| S1 | Une salle est un lieu physique ; ses deux noms mènent à la même occupation (réserver « Salle 小班 » prend « Salle Fidélité »). |
| S2 | L'**emploi du temps fixe** du dimanche se saisit une fois (coordination), par semaine ; il s'affiche occupé et ne se réserve pas par-dessus. Il a trois variantes, choisies d'après la feuille du planning : dimanche ordinaire, Intergroupe, Interfranco (tableau ci-dessus). Une autre exception (fête) se règle à part : à dessiner. |
| S3 | **Réserver** : tout membre connecté (Timothée) choisit une salle, une date, « de » et « à » librement (Timothée), dit pour qui et pour quoi. Un chevauchement est refusé, comme sur la Scène. |
| S4 | **Réunion, évènement** : choisir une salle dans leur formulaire la réserve (Timothée) ; la réservation suit la date et l'heure, et part avec la réunion. Le lieu en texte libre reste pour l'extérieur. |
| S5 | **La Scène** est réservée par le même système (Timothée, 16/11 : « la fusionner », « revoir tout le système de réservation ainsi que sa page »). Elle est dans la Grande salle : ce qui occupe l'une occupe l'autre. La fête garde ce qui lui est propre (ordre de passage, chants, « Qui peut réserver »). **Date de bascule de la Scène** : à trancher (S-Q10), la saison de Noël est en cours. |
| S6 | Permissions en double (`src/lib/access.ts` et `firestore.rules`) : règles à publier par Timothée. Occupations lisibles par tout connecté, comme les setlists et les profils. |
| S7 | Back-office : derrière `BACK_OFFICE` pour la saisie de l'emploi du temps ; la réservation est dans l'App. |

## Questions ouvertes

Toutes tranchées le 16/11/2026 : S-Q1 à S-Q4 et S-Q10 par Timothée (AR7, AR9), S-Q5 à S-Q9 par la planche (AR1 à
AR9, AR10 à AR18).

**Faits, à Timothée**

- S-Q1 à S-Q4 : **répondues le 16/11/2026** (tableaux ci-dessus). Non demandé : la « salle à côté de réunion » du
  premier retour est-elle la Salle imprimante ?
- S-Q10. La Scène bascule-t-elle dans le nouveau système avant Noël (réservations en cours à reprendre) ou après ?

**Dessin, pour la planche**

- S-Q5. Où vit la section (onglet de l'App, Évènements, Calendrier) et son nom (« Salles ») ? Timothée, 16/11 :
  « L'onglet évènement est à changer ? » : aujourd'hui cinq entrées (Chants, Setlists, Planning, Évènements, Moi) et,
  dans Évènements, un rail Agenda · Pâques · Noël.
- S-Q6. La vue d'un jour : salles en colonnes et heures en lignes, ou liste par salle ; ce qu'on voit au téléphone.
- S-Q7. La feuille de réservation, et ce qu'un refus propose (salles libres à cette heure).
- S-Q8. Le champ « salle » des formulaires de réunion et d'évènement.
- S-Q9. Une réservation répétée par un membre (« tous les mardis ») : dès le premier lot, ou plus tard ?

## Lots pressentis (découpés dans § « Lots et tranches »)

1. Les salles, l'emploi du temps fixe, la vue d'un jour (lecture).
2. Réserver librement, refus des chevauchements.
3. Réunions et évènements réservent leur salle.
4. La Scène passe dans le même système (date : S-Q10).

## Décisions déléguées (session de spec, 16/11)

Propositions de la planche (« Questions à trancher », « Finitions »), retenues selon leur recommandation ; aucune n'est
difficile à défaire. Timothée les corrige d'un mot.

| # | Décision | Motif |
|---|---|---|
| AR10 | Rail **« Évènements · Salles · Pâques · Noël »** : « Évènements » est l'ancien « Calendrier » (même page, `/evenements`). Salles est la deuxième place, à `/evenements/salles`. | AR2 ; décision déléguée (session, 16/11). |
| AR11 | En 中文 : entrée **教会**, sous-titre **活动、场地和节日**, onglet **活动** (ex-日历), onglet Salles **场地** ; « Liste · Grille » = **列表 · 网格**. | Libellés courts, tiennent dans le rail à 375 px ; décision déléguée (session, 16/11), à corriger par Timothée. |
| AR12 | **Repère d'heure** : l'état en mots se lit « maintenant » aujourd'hui, « à 8:00 » un autre jour ; le repère « à HH:MM » de la ligne de contexte se touche pour changer l'heure (pas de 15 min). | Planche (« Vue d'un jour ») ; décision déléguée (session, 16/11). |
| AR13 | **L'emploi du temps fixe vit dans le code** (`src/lib/salles/emploi.ts`) : trois variantes, choisies d'après les services du planning du jour (Intergroupe, Interfranco), comme le Calendrier les lit. Une saisie au Back-Office (exceptions datées) vient plus tard (§ Hors périmètre). | Timothée l'a donné une fois (AR7) ; le changer est un commit. Une saisie en base coûterait un lot entier avant de servir. Décision déléguée (session, 16/11). |
| AR14 | **Le jour J d'une fête** (programme `jourJ`), la Grande salle et la Scène sont occupées **toute la journée** par « Noël, jour J » (ou « Pâques, jour J ») ; l'emploi du temps fixe de la Grande salle est remplacé ce jour-là. | La fête n'a pas d'heures saisies ; le lot Scène (5) pourra en ajouter. Décision déléguée (session, 16/11). |
| AR15 | **Réunions et évènements ne créent pas de document de réservation** : l'évènement porte un champ `salle` ; Salles le lit comme une occupation. Il part, bouge et disparaît avec l'évènement, sans synchronisation. | Plus simple que la proposition « la réservation se crée avec la réunion », même effet à l'écran. Décision déléguée (session, 16/11). |
| AR16 | **Pour qui** : liste fermée (les valeurs de `QUI`, puis les équipes de l'organigramme) et « Autre… » en texte (60 caractères). Le prénom de l'auteur s'affiche toujours. | AR9 ; décision déléguée (session, 16/11). |
| AR17 | **Couleurs** de la planche gardées : culte sinophone `#64748b` (gris de repli), groupes d'après `CATEGORY_COLORS`, classes 小班 / 中班 / 大班 / 高班 vert des classes d'EDD (`#3b6d11`), réservations libres en encre neutre. Fond des listes : la fiche de la planche (groupes gris sur blanc). | Planche ; décision déléguée (session, 16/11). |
| AR18 | La page Salles est **dans l'App** (pas de Back-Office) et visible des connectés seuls ; elle suit l'interrupteur de la section (`navigation.ts` : `/evenements` n'existe qu'avec `BACK_OFFICE`). | S7, AR9. |

## Modèle

**Salles** (`src/lib/salles/salles.ts`, dans le code) : neuf entrées, dans l'ordre de l'écran.

| id | Nom (fr et 中文) | Autre nom | Groupe d'affichage |
|---|---|---|---|
| `grande` | Grande salle | | Grande salle |
| `scene` | Scène | dans la Grande salle | Grande salle (en retrait) |
| `fidelite` | Salle Fidélité | 小班 | Salles de groupe |
| `paix` | Salle Paix | 高班 | Salles de groupe |
| `amour` | Salle Amour | 大班 | Salles de groupe |
| `bonte` | Salle Bonté | | Salles de groupe |
| `zhongban` | Salle 中班 | | Salles de groupe |
| `imprimante` | Salle imprimante | | Bureaux |
| `reunion` | Salle de réunion | | Bureaux |

`lieuxLies(id)` : `grande` ↔ `scene` (AR6) ; toute autre salle n'est liée qu'à elle-même.

**Emploi du temps fixe** (`src/lib/salles/emploi.ts`) : `occupationsFixes(date, variante)` rend, pour un dimanche, les
occupations des tableaux « Les salles » et « Le temps de groupe » ; aucun autre jour n'en a. `varianteDu(date,
services)` : `intergroupe` si un service du planning de cette date a la catégorie Intergroupe, `interfranco` pour
Interfranco, sinon `ordinaire`. Les services viennent de la même lecture que le Calendrier (`ServiceEntry`).

**Réservations** (Firestore, REST seulement) : collection `reservations/{id}`.

```ts
interface Reservation {
  id: string
  salle: SalleId          // une des neuf
  date: string            // « AAAA-MM-JJ »
  debut: string           // « HH:MM »
  fin: string             // « HH:MM », > debut, même jour
  pour: string            // valeur de la liste ou texte d'« Autre… », 60 caractères au plus
  quoi: string            // 80 caractères au plus
  auteurUid: string
  auteurNom: string
  createdAt: string
  updatedAt: string
}
```

Lecture d'un jour : `runQuery` sur `date ==` ; d'une semaine (journée d'une salle en volet) : `date >=` et `date <=`.
Un seul champ : index automatiques, **aucun index composite à créer**.

**Évènements et réunions** (lot 4) : champ facultatif `salle?: SalleId` dans `evenements/{id}` (`src/types/evenement.ts`).
Absent = « Ailleurs » (le `lieu` en texte libre reste).

**Occupations d'un jour** (`src/lib/salles/occupations.ts`, fonctions pures) : `occupationsDu(date, sources)` réunit
l'emploi du temps fixe, le jour J d'une fête, les créneaux de la Scène (lecture seule jusqu'au lot 5), les
réservations et les évènements portant une salle ; chaque occupation porte `salle`, `debut`, `fin`, `libelle`,
`source` (`fixe`, `fete`, `scene`, `reservation`, `evenement`) et, au besoin, l'id et l'auteur. Une occupation de
`grande` ou de `scene` vaut pour les deux (`lieuxLies`).

## Règles

| # | Règle |
|---|---|
| SA1 | Salles montre un jour (aujourd'hui par défaut) ; une bande de jours au-dessus change de jour ; la ligne de contexte dit la variante (« Dimanche ordinaire », « Intergroupe », « Interfranco », « Noël, jour J ») et le repère d'heure (AR12). |
| SA2 | **Liste** : une ligne par salle, groupée (Grande salle avec la Scène en retrait, Salles de groupe, Bureaux), l'autre nom à côté du nom ; l'état en mots à l'heure du repère : « Libre jusqu'à HH:MM », « Libre tout l'après-midi / toute la soirée » (rien jusqu'à 22:00), « <occupant> jusqu'à HH:MM » ; sous l'état, les réservations et évènements du jour en une ligne chacun (« 18:30 – 19:30 · Sketch · Fidélité · Gaëlle »). La Scène dit « Avec la Grande salle : … » quand c'est la Grande salle qui l'occupe. |
| SA3 | **Grille** : salles en colonnes (neuf), heures de 8:00 à 22:00 en lignes ; chaque occupation est un bloc à sa hauteur, coloré selon AR17. Au téléphone, la grille défile à l'horizontale, colonne des heures figée. |
| SA4 | Toucher une ligne de la Liste ouvre la journée de la salle : une page au téléphone, un volet de droite (la semaine de la salle) en tablette paysage et à l'ordinateur. Toucher un bloc de la Grille ouvre son détail ; celui d'un évènement mène à sa fiche, celui d'un créneau de scène à la fête. |
| SA5 | Vue par défaut : Liste au téléphone et en tablette portrait, Grille en tablette paysage et à l'ordinateur ; le choix de la personne est retenu sur l'appareil (`localStorage`, clé `gcc-salles-vue`) (AR3). |
| SA6 | **Réserver** (bouton « Réserver une salle », et une case vide de la Grille) ouvre une feuille : date, de, à d'abord (pré-remplis par la case touchée), puis les salles, libres en tête, occupées grisées et non choisissables avec leur raison (« Groupe Joie jusqu'à 14:30 »), puis pour qui (AR16), pour quoi. Tout membre connecté réserve (AR4). |
| SA7 | Une réservation : `fin > debut`, le même jour, entre 6:00 et 23:59, date d'aujourd'hui ou après ; `quoi` obligatoire. |
| SA8 | **Chevauchement refusé** (AR4, AR6) : avant d'écrire, la feuille relit les occupations du jour ; une occupation de la même salle ou d'un lieu lié qui croise `[debut, fin[` bloque l'enregistrement. Le refus nomme l'occupant et l'heure, propose les salles libres sur le même moment et « Décaler » (même salle, première fenêtre de même durée après l'occupation, si elle tient avant 22:00). Deux bornes qui se touchent (14:30 / 14:30) ne se croisent pas. |
| SA9 | Deux enregistrements simultanés qui passent quand même : comme la Scène, un message aux deux auteurs (`/api/salles/conflit`, clé anti-doublon), fonctions pures dans `src/lib/salles/conflit.ts`. |
| SA10 | Sa réservation se modifie (même feuille, même contrôle SA8 hors elle-même) et se supprime par son auteur ; la coordination modifie ou supprime toute réservation. L'emploi du temps fixe, le jour J et les créneaux de la Scène ne se modifient pas depuis Salles. |
| SA11 | **Glisser** sur une case vide de la Grille (ordinateur, tablette) crée la plage au quart d'heure et ouvre la feuille ; au clavier, Entrée sur une case ouvre la feuille à cette heure. Au toucher, un appui sur une case suffit (pas de glisser imposé). |
| SA12 | **Évènement ou réunion** (lot 4) : un champ « Salle de l'église » (les neuf, plus « Ailleurs ») ; « Ailleurs » fait paraître le lieu en texte libre. Une salle choisie exige une heure de début et de fin ; un chevauchement bloque l'enregistrement avec le message de SA8. Le `lieu` affiché devient le nom de la salle. |
| SA13 | Les créneaux de la Scène des fêtes en cours restent réservés **dans la page de la fête** jusqu'au lot 5 ; Salles les montre comme occupations de la Scène et de la Grande salle, et SA8 en tient compte. Un créneau de fête qui croise l'emploi du temps fixe (groupe Joie, culte sinophone) s'affiche tel quel : Salles le rend visible, la fête ne change pas avant le lot 5. |
| SA14 | Sans compte : ni onglet Salles ni page (`/evenements/salles` renvoie vers la connexion, comme les fêtes). |

## Permissions (en double : `src/lib/access.ts` et `firestore.rules`)

| Action | Client (`access.ts`) | Serveur (`firestore.rules`) |
|---|---|---|
| Lire Salles et les réservations | `canVoirSalles(user)` : connecté | `match /reservations/{id}` : `allow read: if signedIn()` |
| Réserver | `canReserverSalle(user)` : connecté | `allow create: if signedIn() && auteurUid == request.auth.uid && reservationValide()` (salle parmi les neuf, `date`, `debut`, `fin` au bon format, `debut < fin`, `pour` ≤ 60, `quoi` 1 à 80 caractères) |
| Modifier, supprimer | `canEditReservation(user, profile, r)` : auteur ou `isCoordination` | `allow update: if signedIn() && (isCoordination() \|\| resource.data.auteurUid == request.auth.uid) && reservationValide() && auteurUid inchangé` ; `allow delete` : auteur ou coordination |
| Salle d'un évènement (lot 4) | rien de nouveau : `canEditEvenement` | rien de nouveau ; `salle` ajouté à la liste des champs permis s'il en existe une (à vérifier au lot 4) |

Le chevauchement ne se vérifie pas dans les rules (pas de requête possible) : client (SA8) puis message (SA9), comme
la Scène. **Les rules se publient à la main par Timothée** (lot 3).

## Libellés (FR · 中文)

| Clé (proposée) | FR | 中文 |
|---|---|---|
| `common.header.evenements` | Église | 教会 |
| `evenements.sousTitre` | Évènements, salles et fêtes | 活动、场地和节日 |
| `evenements.tabs.calendrier` | Évènements | 活动 |
| `evenements.tabs.salles` | Salles | 场地 |
| `salles.vue.liste` · `salles.vue.grille` | Liste · Grille | 列表 · 网格 |
| `salles.groupes.grande` · `.groupe` · `.bureaux` | Grande salle · Salles de groupe · Bureaux | 大厅 · 小组教室 · 办公室 |
| `salles.variante.ordinaire` · `.intergroupe` · `.interfranco` | Dimanche ordinaire · Intergroupe · Interfranco | 普通主日 · Intergroupe · Interfranco |
| `salles.jourJ` | {{fete}}, jour J | {{fete}}当天 |
| `salles.repere` | à {{heure}} | {{heure}} |
| `salles.etat.libreJusqua` | Libre jusqu'à {{heure}} | 空闲至 {{heure}} |
| `salles.etat.libreApresMidi` · `.libreSoiree` | Libre tout l'après-midi · Libre toute la soirée | 下午空闲 · 晚上空闲 |
| `salles.etat.occupeJusqua` | {{qui}} jusqu'à {{heure}} | {{qui}}，至 {{heure}} |
| `salles.avecGrande` | Avec la Grande salle : {{etat}} | 与大厅同用：{{etat}} |
| `salles.reserver` | Réserver une salle | 预订场地 |
| `salles.feuille.date` · `.de` · `.a` · `.salle` · `.pourQui` · `.pourQuoi` · `.autre` | Date · De · À · Salle · Pour qui · Pour quoi · Autre… | 日期 · 从 · 到 · 场地 · 为谁 · 做什么 · 其他… |
| `salles.refus` | {{salle}} est prise : {{qui}}, {{debut}} – {{fin}}. | {{salle}}已被占用：{{qui}}，{{debut}}–{{fin}}。 |
| `salles.libresMemeMoment` | Libres au même moment | 同一时段空闲 |
| `salles.decaler` | Décaler à {{debut}} – {{fin}} | 改到 {{debut}}–{{fin}} |
| `salles.formulaire.salle` · `.ailleurs` | Salle de l'église · Ailleurs | 教会场地 · 其他地点 |
| `salles.conflit.titre` | Salles : chevauchement | 场地：时段重叠 |

Noms de salles : en français dans les deux langues (AR9), sauf 小班, 中班, 大班, 高班. Les noms de groupe en 中文
(大厅, 小组教室, 办公室) ne sont pas des noms de salle et suivent `i18n-sync`. Les noms d'occupant de l'emploi du temps
(« Groupe Joie », « Culte sinophone », « Entraînement louange ») passent par les clés existantes des catégories
quand il y en a, sinon des clés `salles.occupant.*`.

## Lots et tranches

Un go par lot ; le go d'un lot vaut pour toutes ses tranches ; une session orchestratrice par tranche
(`CLAUDE.md`, « Coder »), `source_revision` et `outcome_branch` = `claude/corrections-design`. Tests écrits d'abord
(rouges), puis le code.

**Lot 1 — L'entrée « Église »** (petit, une tranche, aucune règle à publier)
- **T1** : libellés AR10, AR11 (entrée, sous-titre, onglet « Évènements »), icône `Church` (lucide) à la place de
  `Ticket` dans les deux listes de `src/lib/navigation.ts` ; `labelDeSection` suit la clé (« GCC Église »). Les
  autres usages de `common.header.evenements` (`git grep`) sont relus un à un : ceux qui désignent la liste des
  évènements prennent une clé à eux. Specs touchées : celles qui lisent « Évènements » / « Calendrier » dans la barre
  ou le rail (`git grep -l "Calendrier\|Évènements" tests/`). Ne touche pas `src/app/evenements/scene/` (AQ).

**Lot 2 — Salles en lecture**
- **T2a** : modèle et fonctions pures (`salles.ts`, `emploi.ts`, `occupations.ts`), sans écran ; tests des fonctions
  (variantes, jour J, Scène ↔ Grande salle, état en mots, bornes qui se touchent).
- **T2b** : onglet « Salles » dans le rail (connectés), page `/evenements/salles`, vue Liste, bande de jours, ligne de
  contexte et repère d'heure, journée d'une salle (page au téléphone, volet en grand). Sources lues : services du
  planning, programmes et créneaux de scène. Spec d'agencement dans `SPECS_GRAND_ECRAN`.
- **T2c** : vue Grille, sélecteur « Liste · Grille », défaut par appareil et choix retenu (SA5), détail d'un bloc.
  Fin de lot : specs du lot et de la section Évènements.

**Lot 3 — Réserver** (rules à publier par Timothée avant la mise en ligne)
- **T3a** : `src/lib/firebase/reservations.ts` (REST), `reservations/{id}` dans `firestore.rules`, `canVoirSalles`,
  `canReserverSalle`, `canEditReservation` ; feuille « Réserver » (SA6, SA7), lecture des réservations dans
  Salles ; modifier et supprimer la sienne (SA10).
- **T3b** : refus du chevauchement, salles libres au même moment, « Décaler » (SA8) ; route `/api/salles/conflit`
  et `src/lib/salles/conflit.ts` (SA9). Les routes API passent à 21 : mettre à jour `CLAUDE.md` et la référence.
- **T3c** : gestes de la Grille (SA11 : appui, glisser au quart d'heure, Entrée au clavier).

**Lot 4 — Réunions et évènements réservent leur salle**
- **T4a** : champ « Salle de l'église » / « Ailleurs » dans `EvenementForm` et `ReunionForm`, type `salle?`,
  contrôle SA12 ; Salles lit les évènements qui portent une salle.
- **T4b** : fiche d'un évènement (« Salle Bonté » à la place du lieu), modifier l'heure ou la salle relance SA8 ; les
  rules de `evenements/{id}` relues (champ `salle`).

**Lot 5 — La Scène dans Salles** (Timothée, 16/11/2026 au soir : « tu peux modifier et je reporterai tout à la main » ;
AR19 à AR23 ci-dessous). Une session par tranche, chacune lance la suivante.

| # | Décision | D'où |
|---|---|---|
| AR19 | **La Scène bascule maintenant, Noël 2026 compris** (remplace la date d'AR9). Aucune reprise automatique : Timothée reporte à la main les réservations de Noël déjà faites. Les anciens documents `programmes/{id}/creneaux` ne sont ni modifiés ni supprimés ; plus rien ne les lit (AR23). | Timothée, 16/11/2026. |
| AR20 | **Un créneau de fête est une réservation** de `reservations/{id}` avec `salle: "scene"` et quatre champs de plus : `fete` (id de l'édition, `noel-2026`), `qui` (valeurs de `QUI`, comme aujourd'hui), `note`, `libre` (SQ-B). `pour` reçoit le libellé des `qui` pour Salles. Les quatre fonctions `listCreneaux`, `createCreneau`, `updateCreneau`, `deleteCreneau` (`src/lib/firebase/programmes.ts`) gardent leur nom et leur type `Creneau` et lisent ou écrivent ces réservations (`runQuery` sur `fete ==` : index automatique) : la page de la fête, le Back-Office, le Calendrier et le tableau de bord suivent sans autre changement. | Décision déléguée (session de spec, 16/11) : le plus petit changement qui fait de la Scène une salle. |
| AR21 | **La fête garde ses règles** : période, plages, « Qui peut réserver », fermeture à la main. Les rules les vérifient pour une réservation qui porte `fete` (`reservable(fete, qui)`, la coordination et les gestionnaires de planning sans limite, comme aujourd'hui). Une réservation de la `scene` **sans** `fete` suit les règles de toute salle. | S5, planche (« Scène ne sert qu'aux règles de la fête ») ; décision déléguée (session de spec, 16/11). |
| AR22 | **Plus de créneaux fixes : la Scène se réserve à l'heure qu'on veut**, comme toute salle (Timothée, 16/11 au soir : « tu peux tout modifier vu que je vais reporter à la main » ; déjà : « laisser les personnes mettre le temps qu'ils veulent réserver »). La page de la fête montre, pour chaque jour réservable de la période, **quand la scène est libre** (« Libre 14:30 – 15:00 · 17:00 – 19:00 », dans les plages de la saison) et les réservations du jour ; « Réserver » ouvre une seule feuille, « de » et « à » au pas de 15 min (celle d'« Un autre moment », qui disparaît en tant que bouton à part), fenêtre libre touchée pré-remplie. Le refus d'un chevauchement compare à toutes les occupations de la Grande salle et de la Scène (emploi du temps fixe, Salles, évènements), avec le message de SA8. La durée d'un créneau (`duree`) sort de la saison ; les plages restent (jours et heures où la fête propose la scène). Dans Salles, choisir la Scène pendant la période d'une fête ouverte affiche « Pendant la saison de <fête>, la Scène se réserve depuis sa page » avec le lien. | Timothée ; AR6, AR8. |
| AR23 | **Pas de liste « À reporter »** : Timothée a pris des captures des réservations de Noël et les reporte lui-même (16/11 au soir : « tu peux enlever les trucs à reporter »). Pas de champ `depuisCreneau`. | Timothée. |

- **T5a — Les créneaux deviennent des réservations** : champs `fete`, `qui`, `note`, `libre`
  (`Reservation`, `reservations.ts`) ; les quatre fonctions de `programmes.ts` (AR20) ; rules de `reservations/{id}`
  (champs permis, `reservable(fete, qui)` repris de `programmes/{id}/creneaux`), miroir dans `access.ts`
  (`canReserverSalle`, `canEditReservation` pour une réservation de fête : auteur, coordination ; `canReserverPour`
  inchangé) ; Salles ne lit plus `listCreneaux` à part (les réservations de la Scène suffisent, `occupations.ts`). Tests
  d'abord : `tests/salles-scene.spec.ts` (une réservation faite depuis la page de Noël apparaît dans Salles sur la
  Scène et la Grande salle ; « Qui peut réserver » respecté) ; specs de la Scène existantes à faire passer
  (`scene-paques-noel`, `scene-saison`, `scene-qui`, `scene-autre-moment`, `programme-scene`, `scene-des-fetes`) : leurs
  routes simulées changent de collection.
- **T5b — Réserver la Scène à l'heure qu'on veut** (AR22) : fenêtres libres par jour à la place de la grille de
  créneaux (page de la fête et vues du Back-Office), une seule feuille « de / à », `duree` retirée de `SaisonForm`,
  refus contre toutes les occupations, message de Salles pendant une saison. Specs de la Scène réécrites là où elles
  lisaient la grille. `critique-design` après (apparence).
- **T5c — Le serveur** : rappels (`src/app/api/cron/reminders/route.ts`, `sceneCreneaux`) et route
  de conflit : la Scène passe par `/api/salles/conflit` ; `/api/scene/conflit` retirée (routes API : 20, `CLAUDE.md` et
  la référence à jour). Fin de lot : specs du lot, de la Scène et de la section Église.

**Mise en ligne du lot 5** : publier `firestore.rules` (champs de fête dans `reservations/{id}`) avant de pousser ;
puis Timothée reporte à la main les réservations de Noël (ses captures). Tant qu'il n'a pas reporté, la page de Noël
n'affiche plus les anciennes réservations : pousser de préférence quand il a le temps de les reporter aussitôt.

## Tests Playwright (écrits d'abord)

Trois appareils toujours ; les specs d'agencement (T2b, T2c, T3c) s'ajoutent à `SPECS_GRAND_ECRAN` (cinq projets).
Données simulées (`tests/helpers/fakeSession.ts`, Firestore intercepté), noms fictifs inventés pour ces specs.

| Spec | Tranche | Ce qu'elle vérifie |
|---|---|---|
| `tests/eglise-entree.spec.ts` | T1 | la barre dit « Église » / « 教会 », le rail « Évènements · Pâques · Noël », les adresses `/evenements…` inchangées, « GCC Église » ; sans compte, pas de rail |
| `tests/salles-modele.spec.ts` | T2a | dimanche ordinaire, Intergroupe, Interfranco (tableau du temps de groupe) ; jour J ; Scène ↔ Grande salle ; « Libre jusqu'à », « Libre tout l'après-midi » ; 14:30 / 14:30 ne se croisent pas |
| `tests/salles-liste.spec.ts` | T2b | onglet Salles pour un connecté seulement ; neuf lignes groupées ; état à 14:00 un dimanche ordinaire ; repère d'heure ; journée d'une salle (page / volet) ; créneau de scène lu comme occupation de la Grande salle |
| `tests/salles-grille.spec.ts` | T2c | neuf colonnes, blocs à leur heure ; défaut Liste au téléphone, Grille en grand ; le choix survit au rechargement ; défilement horizontal au téléphone |
| `tests/salles-reserver.spec.ts` | T3a, T3b | réserver une salle libre ; salles occupées grisées avec leur raison ; refus d'un chevauchement (même salle, Scène contre Grande salle) ; « Décaler » ; modifier et supprimer la sienne ; pas celle d'un autre (sauf coordination) ; message de conflit (route simulée) |
| `tests/salles-gestes.spec.ts` | T3c | glisser au quart d'heure (ordinateur, tablette), appui (téléphone), Entrée au clavier |
| `tests/salles-evenement.spec.ts` | T4a, T4b | champ Salle / Ailleurs ; chevauchement bloqué à l'enregistrement ; l'évènement apparaît dans Salles et la fiche dit la salle |

Chaque tranche se regarde à l'œil sur les quatre dispositions (et 1 440 px pour Salles), puis `critique-design` après
T2b, T2c et T3a (apparence).

## À la mise en ligne (Timothée seul)

- Pousser sur `main`, sur son ordre du moment ; le lot 1 peut partir seul.
- **Lot 3** : publier `firestore.rules` (`reservations/{id}`) dans la console Firebase **avant** de pousser le code ;
  aucun index composite à créer.
- Aucun changement de stratégie dans `public/sw.js` : pas de nouvelle version du cache.
- **Lot 4** : publier `firestore.rules` (`salleEvenementValide` dans `evenements/{id}`, T4b) dans la console Firebase,
  avec celles du lot 3, **avant** de pousser le code.

## Hors périmètre

- Saisie de l'emploi du temps au Back-Office, exceptions datées (un groupe qui ne se réunit pas) : plus tard, sur
  demande (AR13).
- Réservations répétées par un membre (« tous les mardis ») : plus tard (AR9).
- Réservations dans le Calendrier du Back-Office et dans le widget : plus tard.
- Notifications de rappel d'une réservation : non.
- Une dixième salle : non (AR9).
- Tout changement de la Scène avant le lot 5 ; tout fichier de `src/app/evenements/scene/` tant que AQ code.

## Avancement

- 16/11/2026 : cadrage écrit d'après les réponses de Timothée. Reste : S-Q1 à S-Q4, l'accord pour la planche.
- 16/11/2026 : dimanches d'Intergroupe et d'Interfranco ajoutés (S2 à trois variantes). Reste : S-Q1 à S-Q3, la fin
  de S-Q4, l'accord pour la planche.
- 16/11/2026 : Grande salle des dimanches d'Intergroupe (cinq groupes) et d'Interfranco (trois groupes francophones) ;
  S-Q4 répondue. Reste : S-Q1 à S-Q3, l'accord pour la planche.
- 16/11/2026 : S-Q1 à S-Q3 répondues (Salle 中班 à part ; Scène dans la Grande salle ; Salle imprimante : louange du
  culte francophone ; Salle de réunion à part). Portée élargie à tout le système de réservation, Scène comprise.
  Planche `salles-reservation` lancée (accord de Timothée).
- 16/11/2026 : **planche rendue** (`docs/planches/planche-salles-reservation.html`, retouchée après la critique,
  publiée en artefact pour Timothée). Trois pistes : **A. Le tableau des salles (recommandée)** : onglet « Salles » dans
  Évènements (Calendrier · Salles · Pâques · Noël), une ligne par salle avec son état en mots, la Scène en retrait
  sous la Grande salle ; B. La journée de l'église (grille salles × heures, entrée renommée « Agenda ») ; C. Où se
  réunir ? (pas de section, un bouton « Trouver une salle »). Proposé : A, avec de C la feuille qui commence par le
  moment et les fenêtres libres de la scène sur la page de Noël ; bascule de la Scène après Noël 2026. Questions et
  propositions : section « Questions à trancher » de la planche. **Attend le choix de Timothée**, puis les décisions
  et les tranches ici.
- 16/11/2026 : **choix de Timothée** : « J'aime beaucoup la piste A, j'aime beaucoup le calendrier de la piste B pour
  avoir un aperçu global des réservations. Peut être qu'il faut changer le nom de l'onglet événement, parce qu'il y a
  plusieurs choses de mélange dedans ». Retenu : **la piste A, avec la grille de B comme deuxième vue de Salles**
  (« Liste · Grille »). Proposé à Timothée, sans réponse encore : l'entrée de la barre renommée **« Église »** (autre
  nom possible : « Agenda »), rail « Évènements · Salles · Pâques · Noël », adresse `/evenements` inchangée ; Liste par
  défaut au téléphone, Grille par défaut en grand. Une section « Piste retenue » est ajoutée à la planche. Restent sans
  réponse : la bascule de la Scène (proposé : après Noël), le nombre de salles (neuf ou dix), les noms en 中文.
- 16/11/2026 : **planche validée** (« Église, je valide et tu peux go pour coder ») : décisions AR1 à AR9 ci-dessus.
  Le go porte sur le lot AQ (question posée : « Go pour le lot Scène de Noël ? ») ; AR attend sa spec. La session de
  cadrage a atteint son plafond de contexte : une session neuve écrit la suite (§ « Reprise ») et demande le go.
- 16/11/2026 : **spec écrite** (session `session_01UMdfudSTkDY8UL8HEyTfJb`) : décisions déléguées AR10 à AR18, modèle,
  règles SA1 à SA14, permissions, libellés, cinq lots (1 « Église », 2 Salles en lecture, 3 Réserver, 4 réunions et
  évènements, 5 la Scène après Noël), tests, mise en ligne. **Attend le go de Timothée pour le lot 1.**
- 16/11/2026 : **go de Timothée pour le lot 1** (« Oui », en réponse à « Go pour le lot 1 ? »). Tranche T1 confiée à
  une session orchestratrice neuve (même branche). Les lots 2 à 5 attendent chacun leur go.
- 16/11/2026 : **T1 faite, lot 1 fini** (orchestratrice T1). Barre « Église » / « 教会 », icône `Church` (les deux
  listes de `navigation.ts` et la carte de l'accueil), label « GCC Église », titre de la section « Église » / « 教会 »
  (`evenements.title`, d'après la planche validée : décision déléguée, session T1, 16/11), sous-titre « Évènements,
  salles et fêtes », rail « Évènements · Pâques · Noël » (中文 活动 · 复活节 · 圣诞节) ; adresses inchangées. Le retour
  de la fiche (`EvenementClient`) désigne la liste : il lit `evenements.tabs.calendrier` (« ‹ Évènements »).
  Navbar et accueil gardent la clé de l'entrée. Spec `tests/eglise-entree.spec.ts` (15 tests, trois appareils) ;
  douze specs voisines remises aux nouveaux libellés. Tests : 2 363 lancés (16 specs, cinq projets), 38 min, puis
  32 relances vertes (1,5 min) ; tsc et lint propres. Échecs déjà là sur la base `fecf3170`, hors tranche :
  `navigation-grand-ecran` 480, 702, 924 (barre réduite « ChantsChants », libellé doublé), `back-office-coupe` 276
  (« Ruth K. » en double) ; les captures `PW_CAPTURES` (941, P8 1507) n'ont pas été suivies. Regard à l'œil sur les
  quatre dispositions (fr et 中文) : rien à reprendre. `regard` et les agents de `/tranche` n'étaient pas chargés dans
  la session : tranche codée et regardée par l'orchestratrice. **Lots 2 à 5 : attendent chacun leur go.**
- 16/11/2026 : **go de Timothée pour le lot 2** (« go », en réponse à « Lot 2 … : go ? »). Vaut pour T2a, T2b, T2c,
  une session par tranche, chacune lance la suivante. Les lots 3 à 5 attendent leur go.
- 16/11/2026 : **go de Timothée pour les lots 3, 4 et 5** (« Go pour les 3 qui restent aussi »). Ordre : lot 3 (T3a →
  T3c) dès la fin du lot 2, puis lot 4 (T4a, T4b), une session par tranche, chacune lance la suivante. **Lot 5** : le go
  est donné, mais il attend la fin de la saison de Noël (AR9) et sa spec détaillée, écrite après le 25/12/2026 ; il se
  code sans nouveau go si cette spec ne change aucune décision de Timothée. Rappel : avant la mise en ligne du lot 3,
  Timothée publie `firestore.rules` (`reservations/{id}`).
- 16/11/2026 : **T2a faite** (orchestratrice T2a, codée par elle-même : `/tranche` et ses agents n'étaient pas
  chargés). `src/lib/salles/salles.ts` (neuf salles, `lieuxLies`), `emploi.ts` (`varianteDu` d'après les
  `ServiceEntry` du jour, `occupationsFixes` : dimanche seulement, temps de groupe en trois variantes),
  `occupations.ts` (`occupationsDu` : emploi fixe, jour J 00:00–24:00 sur la Grande salle à la place de son emploi
  fixe, créneaux de scène en lecture seule, brouillons écartés ; `occupationsDe` avec les lieux liés ; `croise` ;
  `etatA` et `etatEnMots` fr / 中文 ; `nomOccupant` ; `couleurDe` selon AR17). Décisions déléguées (session T2a,
  16/11) : (1) au temps de groupe d'un dimanche ordinaire, les salles « occupées » portent le nom de leur groupe
  (Fidélité, Paix, Amour, Bonté) ; (2) l'imprimante de 12:20 se nomme « Louange du culte francophone » (法语崇拜敬拜团),
  l'entraînement de 8:30 « Entraînement louange » (敬拜排练), le culte de 15:00 « Culte sinophone » (中文崇拜) ;
  (3) un état libre avant 12:00 se dit « Libre toute la journée » (全天空闲 : clé `salles.etat.libreJournee` à
  ajouter en T2b), sinon on lirait « tout l'après-midi » à 8:00 ; (4) le jour J se dit sans heure de fin
  (« Noël, jour J »). Libellés fr / 中文 dans `occupations.ts` (comme `MOTS` du Calendrier) : T2b peut les passer
  par `salles.*` s'il préfère. Spec `tests/salles-modele.spec.ts` : 14 tests × 3 appareils, 42 verts, 33 s ;
  tsc et lint propres. Aucun écran : pas de regard. Suite : T2b lancée.
- 16/11/2026 : **T2b faite** (orchestratrice T2b, codée par elle-même : `/tranche` et les agents du dépôt n'étaient
  pas chargés ; `critique-design` lancé comme agent général avec sa consigne). Onglet « Salles » / « 场地 » en deuxième
  place du rail pour un connecté (`EvenementsTabs`) ; `/evenements/salles` posé par `SectionEvenements` comme l'agenda
  (`salles/SallesClient.tsx`, `RequireAuth` : sans compte, renvoi vers la connexion, SA14 ; pas de « + Nouvel
  évènement ») ; `/evenements/salles` dans `SECTIONS_EN_DEUX_VOLETS`. Liste : bande de quatorze jours depuis
  aujourd'hui, ligne de contexte (date, variante ou jour J) et repère d'heure en `<select>` sur sa propre ligne
  (« maintenant » aujourd'hui, 08:00 un autre jour, 6:00 → 22:00 au quart d'heure), neuf lignes groupées dans une
  carte, pastille de la couleur de l'occupant (AR17), créneaux de scène en une ligne sous la Scène. Journée d'une
  salle : `/evenements/salles/[salle]` (`JourneeSalle.tsx`) ; page avec « ‹ Salles » en un volet, en grand la
  semaine dans le volet de droite. Sources : `src/lib/salles/charger.ts` (dates d'Intergroupe et d'Interfranco du
  planning, éditions affichées et leurs créneaux, comme le Calendrier). Libellés `salles.*` fr / 中文. Décisions
  déléguées (session T2b, 16/11) : (1) **la semaine du volet part du jour choisi** (sept jours, pas du lundi : un
  dimanche, partir du lundi ne montrait que des jours passés vides, constat de `critique-design`) ; (2) l'état en mots
  reste dans `MOTS` d'`occupations.ts` (« Libre toute la journée » y est déjà) : pas de clé `salles.etat.*` ; (3) les
  noms de variante en 中文 suivent le tableau des libellés (Intergroupe, Interfranco). Retouches de `critique-design`
  faites : semaine, repère sur sa ligne et à 44 px, heure insécable après « jusqu'à », état libre en encre pleine
  et occupé en gris. Laissés pour plus tard : titres de groupe en capitales (motif d'Équipes, à reprendre partout
  ensemble) ; jours de la bande peu marqués sur le fond gris au téléphone. Rail : `eglise-entree`,
  `agencement-v18-t7`, `scene-paques-noel` (P4) lisent désormais « Évènements · Salles · Pâques · Noël ». Spec
  `tests/salles-liste.spec.ts` (8 tests × 5 projets, dans `SPECS_GRAND_ECRAN`) : 40 verts ; avec les voisines
  (`salles-modele`, `eglise-entree`, `agencement-v18-t7`, `scene-paques-noel` filtrée) 237 verts, 1 instable
  (`agencement-v18-t7` : 201, tablette paysage, vert seul), 3 min 46 s. tsc et lint propres. Regard sur les cinq
  projets (liste et journée). Suite : T2c lancée.
- 16/11/2026 : **T2c faite, lot 2 fini** (orchestratrice T2c, codée par elle-même : `/tranche` et les agents du dépôt
  n'étaient pas chargés ; `critique-design` lancé comme agent général avec sa consigne, six captures signalées). Vue
  Grille (`salles/GrilleSalles.tsx`, SA3) : neuf colonnes, 8:00 à 22:00 à 44 px l'heure, un bloc par occupation à sa
  hauteur (22 px au moins), liseré et fond de la couleur AR17 ; une occupation d'un lieu lié (Grande salle ↔ Scène, AR6)
  en hachures, nommée pour les lecteurs d'écran ; repère d'heure en ligne sous les blocs et en pastille dans la colonne
  des heures ; la grille défile à l'horizontale sous 1 024 px (téléphone **et tablette portrait**), colonne des heures
  figée, et tient en largeur au-delà. Détail d'un bloc (SA4) : dialogue (qui, salle, jour et heures, « Inscrit par »),
  lien « Page de Noël » pour un créneau de scène ou un jour J (`lien` ajouté au jour J dans `occupations.ts`).
  Sélecteur « Liste · Grille » (`Segment`, à droite de la ligne de contexte) ; vue par défaut Grille en deux volets
  (`useDisposition() === "grand"`), Liste sinon ; choix retenu dans `localStorage` `gcc-salles-vue` (SA5). En Grille, la
  page prend toute sa largeur ; sur la journée d'une salle, le volet de gauche reste la Liste. Libellés `salles.vue.*`,
  `salles.grille`, `salles.detail.*` fr / 中文 ; police chinoise refaite (`build-fonts.py`). Décisions déléguées
  (session T2c, 16/11) : (1) la Grille défile aussi en tablette portrait (colonnes de 6,5 rem), sinon les noms et les
  heures étaient rognés (constat de `critique-design`) ; (2) le sélecteur se pose à droite de la ligne de contexte, pas
  sous le rail des onglets, pour ne pas se lire comme un onglet de plus. Retouches de `critique-design` faites : hauteur
  minimale des blocs, heures en encre à 75 % (contraste), noms sur deux lignes, hachures nommées. Laissés pour plus
  tard : en-tête des colonnes collant au téléphone (il faudrait le défilement vertical dans la grille), légende des
  hachures. `salles-liste` pose désormais « liste » (la Grille est le défaut en grand). Spec
  `tests/salles-grille.spec.ts` (8 tests × 5 projets, dans `SPECS_GRAND_ECRAN`) : 34 verts, 6 propres à un appareil
  sautés. **Fin de lot** : `salles-modele`, `salles-liste`, `salles-grille`, `eglise-entree`, `calendrier`,
  `agencement-v18-t7` (8 min) puis `scene-paques-noel` filtrée sur P4 (58 verts, 1 min 12 s) ; 19 échecs de
  `salles-liste` en grand (Grille par défaut), corrigés et repassés avec `salles-grille` (79 verts, 1 min 17 s) ;
  `agencement-v18-t7` : 201 instable (ordinateur cette fois), vert seul. Environ 12 min de tests en tout. tsc et lint
  propres. Regard sur les cinq projets (grille, détail, liste). Suite : lot 3, T3a lancée.
- 16/11/2026 : **T3a faite** (orchestratrice T3a, codée par elle-même : `/tranche` et les agents du dépôt n'étaient pas
  chargés ; `critique-design` lancé comme agent général avec sa consigne, six captures signalées).
  `src/lib/firebase/reservations.ts` (REST : `listReservations` sur une plage de `date`, `createReservation`,
  `updateReservation`, `deleteReservation`) ; `reservations/{id}` dans `firestore.rules` (`reservationValide()` : salle
  parmi les neuf, formats, `debut < fin`, `pour` ≤ 60, `quoi` 1 à 80 ; auteur inchangé à la modification) ;
  `canVoirSalles`, `canReserverSalle`, `canEditReservation` dans `access.ts`. **`firestore.rules` est à publier à la
  main par Timothée avant la mise en ligne du lot 3.** Source `reservation` dans `occupationsDu` (encre neutre, AR17 ;
  `libellePour`) ; `chargerSalles` lit les réservations d'aujourd'hui à J+19 (bande et semaine du volet), relues après
  chaque écriture. Feuille « Réserver » (`salles/FeuilleReserver.tsx`, `FeuilleOuPanneau` : feuille du bas, panneau à
  droite en deux volets) : date, de, à pré-remplis (jour choisi, repère au quart d'heure suivant, une heure), salles
  libres en tête avec « Libre jusqu'à… », occupées grisées et non choisissables avec leur raison, pour qui, pour quoi ;
  SA7 en messages sous les heures ; bouton d'envoi en pied collant. Bouton « Réserver une salle » dans l'en-tête dès
  768 px (évènement `RESERVER_SALLE`), pilule en bas de la liste au téléphone. Modifier et supprimer (SA10) : depuis le
  détail d'un bloc de la Grille et la journée d'une salle (une réservation y ouvre le même détail), confirmation par
  la fenêtre du site. Décisions déléguées (session T3a, 16/11) : (1) « Pour qui » enregistre une valeur de `QUI`,
  `equipe:<id>` pour une équipe de l'organigramme (nom court à l'écran, dans la langue) ou le texte d'« Autre… » ; il
  est facultatif (« Non précisé ») ; (2) `auteurNom` = le prénom ; (3) une salle choisie qui devient occupée bloque
  l'envoi sans message (le refus nommé et « Décaler » sont T3b) ; (4) une seule requête par plage de dates plutôt
  qu'une par jour. Firestore simulé : `fakeSession` applique les filtres de `date` sur `reservations`. Retouches de
  `critique-design` faites : pied collant, état libre des salles, « Supprimer » à gauche. Laissés pour plus tard :
  blocs courts de la Grille tronqués (heure perdue, déjà là en T2c), apostrophe courbe dans tous les `salles.*`,
  croix de fermeture de la feuille au téléphone (motif commun de `FeuilleOuPanneau`), largeur de la feuille en
  tablette portrait. Spec `tests/salles-reserver.spec.ts` (12 tests × 5 projets, dans `SPECS_GRAND_ECRAN`) ; avec
  `salles-liste`, `salles-grille`, `salles-modele` : 172 verts, 10 sautés (propres à un appareil), 2 min 33 s (≈ 9 min
  de tests en tout dans la tranche). tsc et lint propres ; police chinoise refaite. Regard sur les cinq projets
  (feuille, page, détail). Suite : T3b lancée.
- 16/11/2026 : **T3b faite** (orchestratrice T3b, codée par elle-même : `/tranche` et les agents du dépôt n'étaient pas
  chargés ; `critique-design` lancé comme agent général avec sa consigne, trois captures signalées).
  `src/lib/salles/conflit.ts` (fonctions pures : `chevauchement` — même salle ou lieu lié, bornes qui se touchent
  permises, hors la réservation modifiée —, `sallesLibres`, `decalage` — même salle, même durée, après l'occupation et
  celles qui la suivent, null après 22:00 ou devant un jour J —, `reservationsSeChevauchent`, `autreQuiCroise`,
  `conflictKey`, `conflictMessage`). Feuille : la salle choisie que le moment fait croiser une occupation montre un
  encadré (`salles.refus` : la salle, l'occupant, ses heures), « Décaler à … » et « Libres au même moment » (une pilule
  par salle libre, qui la choisit) ; l'envoi reste bloqué. À l'envoi, `enregistrer` relit les réservations du jour
  avant d'écrire : prise entre-temps, il rend « refus », n'écrit rien et la feuille, relue, nomme l'occupant. Après
  l'écriture, une relecture cherche une réservation enregistrée au même moment qui croise la sienne : elle est signalée
  à la nouvelle route **`/api/salles/conflit`** (SA9, comme la Scène : relit les deux documents, vérifie le
  chevauchement, push et cloche aux deux auteurs, clé `salles-conflit-<ids>` dans `notifLog`, 404 back-office coupé).
  **21 routes API** : `CLAUDE.md` et la référence (§ Routes API) mis à jour ; route ajoutée à `routes-bornes` et
  `back-office-coupe`. Décisions déléguées (session T3b, 16/11) : (1) la cloche a une sorte `salles` (« Salles » /
  « 场地 ») plutôt que `scene` ; (2) le titre du message de conflit est écrit dans `conflit.ts` comme celui de la
  Scène (pas de clé `salles.conflit.titre` dans les JSON : le serveur n'utilise pas i18next) ; (3) seules les
  réservations se relisent à l'envoi (emploi du temps fixe et créneaux de scène changent peu, déjà lus). **Aucune
  règle de `firestore.rules` changée en T3b** ; celle de T3a (`reservations/{id}`) reste à publier à la main par
  Timothée avant la mise en ligne du lot 3. Spec `tests/salles-reserver.spec.ts` : 11 tests T3b de plus (fonctions,
  refus nommé, « Décaler », salle libre d'un geste, Scène ↔ Grande salle, relecture à l'envoi, modification hors
  elle-même, SA9 route simulée, 401 sans jeton, 中文) ; avec `salles-liste`, `salles-grille`, `salles-modele` : 227
  verts, 10 sautés, 2 min 38 s ; `routes-bornes` et `back-office-coupe` filtrés : 216 verts, 12 s (≈ 5 min de tests en
  tout dans la tranche). tsc et lint propres (0 erreur) ; police chinoise refaite (inchangée). Regard sur les cinq
  projets (feuille avec refus). Retouches de `critique-design` faites (commit de suite) : « Décaler » en bouton plein,
  survol, appui et focus sur les pilules, plages et deux-points insécables, message en encre (bord et fond rouges) ;
  `salles-reserver` repassée : 111 verts, 4 sautés, 1 min 36 s. Non regardés : thème sombre. Suite : T3c lancée.
- 16/11/2026 : **T3c faite, lot 3 fini** (orchestratrice T3c, codée par elle-même : `/tranche` et les agents du dépôt
  n'étaient pas chargés ; `critique-design` lancé comme agent général avec sa consigne, trois captures signalées).
  Gestes de la Grille (SA11, SA6) dans `GrilleSalles.tsx` : sous les blocs, une case par heure et par salle
  (`data-case`, nommée « Réserver Salle de réunion à 16:00 » / « 预订 … 16:00 », clé `salles.case`). Glisser à la
  souris, au trackpad ou au stylet (ordinateur, tablette) dessine la plage au quart d'heure (`data-plage`, pointillés,
  heures écrites ; les quarts touchés, 15 min au moins, 8:00 – 22:00) et ouvre la feuille ; un clic ou un appui ouvre
  l'heure de la case pour une heure ; au clavier, une seule case dans l'ordre de tabulation, les flèches changent de
  case (heure, salle), Entrée l'ouvre et la case focalisée dit « 11:00 + ». Le toucher n'est pas capté : défilement
  horizontal du téléphone (SA3) et détail d'un bloc (SA4) inchangés. La feuille reçoit la date du jour affiché et la
  **salle de la colonne** (`Ouverture.salle`). Décisions déléguées (session T3c, 16/11) : (1) la salle de la case est
  pré-choisie (la case touchée la nomme) ; (2) un appui ou un clic ouvre l'heure entière de la case, pas le quart sous
  le doigt (plus sûr au toucher) ; seul le glisser donne le quart d'heure ; (3) pas de cases un jour passé ni sans
  droit de réserver ; (4) au toucher, pas de glisser (il défilerait la page) : l'appui suffit, comme le veut SA11.
  Retouches de `critique-design` faites : plage d'un seul ton (survol coupé pendant le glisser) sur fond clair, heure
  dans la case focalisée, coins arrondis du contour. Laissé : le bouton « Réserver » reste grisé tant que « Pour quoi »
  est vide, sans le dire (T3a, SA7 ; à reprendre avec la croix de la feuille). **Aucune règle de `firestore.rules`
  changée en T3c** ; celle de T3a (`reservations/{id}`) reste **à publier à la main par Timothée avant la mise en
  ligne du lot 3**. Spec `tests/salles-gestes.spec.ts` (8 tests × 5 projets, dans `SPECS_GRAND_ECRAN`) : 35 verts,
  5 propres à un appareil sautés, 1 min 29 s (2 min 18 s après les retouches). **Fin de lot** : `salles-gestes`,
  `salles-reserver`, `salles-liste`, `salles-grille`, `salles-modele` : 262 verts, 15 sautés, 4 min 14 s. Section
  Évènements : la série entière (`git grep -l "/evenements" tests/` hors les deux grosses specs) compte 6 933 tests,
  ≈ 8 h à trois ouvriers ; arrêtée après 208 tests (3 échecs sous la charge, verts seuls avec `eglise-entree` : 26
  verts, 49 s) ; puis `calendrier`, `evenements`, `pages-en-grand-evenements` : 764 verts, 144 sautés, 13 min (T3c ne
  touche que les fichiers de Salles). Environ 35 min de tests en tout dans la tranche. tsc et lint propres (0 erreur) ;
  police chinoise refaite (inchangée). Regard sur les cinq projets (glisser, feuille ouverte d'un appui, contour au
  clavier). Non regardés : thème sombre. Suite : T4a lancée.
- 16/11/2026 : **T4a faite** (orchestratrice T4a, codée par elle-même : `/tranche` et les agents du dépôt n'étaient pas
  chargés ; `critique-design` lancé comme agent général avec sa consigne, trois captures signalées). Type
  `salle?: SalleId | null` sur `Evenement` (lu par `estSalleId`) ; champ « Salle de l'église » (`src/components/salles/
  ChampSalle.tsx`) dans `EvenementForm` et `ReunionForm` à la place du lieu : « Ailleurs » (par défaut) puis les neuf
  salles en groupes ; « Ailleurs » montre le lieu en texte libre ; une salle montre « Heure de fin » sous l'horaire et
  l'exige (`salles.formulaire.heures`, fin après début). À l'enregistrement, `verifierSalle` relit les occupations du
  jour (`occupationsPourEvenement` dans `charger.ts` : réservations et évènements de ce jour, planning et scène) ; un
  chevauchement bloque l'écriture et montre le refus de SA8 sous le champ (`RefusSalle`, encadré extrait de la feuille
  « Réserver » et partagé : l'occupant, « Décaler », salles libres). Le `lieu` écrit devient le nom de la salle ;
  « Ailleurs » écrit `salle: null`. À la modification, l'évènement ne se gêne pas lui-même (`evenementId` passé par
  `ModifierClient`). Salles : source `evenement` dans `occupationsDu` (AR15) ; `chargerSalles` lit les évènements
  (`listEvenements`) ; détail d'un bloc avec « Voir l'évènement » vers sa fiche. Décisions déléguées (session T4a,
  16/11) : (1) une salle vaut pour le jour de début seulement (`date`, `heure` – `heureFin`), même avec une date de fin ;
  (2) une réunion ou un évènement que la personne ne peut pas voir (`canSeeEvenement`) occupe sa salle sous le nom
  « Réunion d'équipe » / « 团队会议 », sans lien ; (3) évènements à l'encre neutre, comme les réservations (AR17) ;
  (4) planning ou scène illisibles comptent pour rien dans la vérification ; réservations ou évènements illisibles
  bloquent l'enregistrement (`salles.formulaire.echec`) ; (5) la salle ne s'écrit que si l'évènement en a ou en avait
  une (pas de `salle: null` sur tous les évènements). **Aucune règle de `firestore.rules` changée** : `evenements/{id}`
  n'a pas de liste de champs permis (à relire en T4b) ; celle de T3a (`reservations/{id}`) reste **à publier à la main
  par Timothée avant la mise en ligne du lot 3**. Spec `tests/salles-evenement.spec.ts` (11 tests × 3 appareils, pas
  d'agencement : hors `SPECS_GRAND_ECRAN`) : 33 verts, 56 s. Voisines : `salles-reserver`, `-liste`, `-grille`,
  `-modele`, `-gestes` : 262 verts, 15 sautés, 3 min 48 s ; `evenements`, `reunions`, `equipes-reunions` : 520 verts,
  11 sautés, 9 échecs, 7 min 27 s (ordre des libellés du formulaire, attendu ; titre « Évènements » devenu « Église »
  au lot 1, échec d'avant T4a) corrigés puis 9 verts, 20 s ; `calendrier` filtré (`-g` évènement, réunion) : 129 verts,
  1 min 30 s ; après les retouches, `salles-evenement` et `salles-reserver` : 144 verts, 4 sautés, 3 min 2 s (≈ 17 min
  de tests en tout). tsc et lint propres (0 erreur) ; police chinoise refaite (inchangée). Regard sur les cinq tailles
  (formulaire avec refus). Retouches de `critique-design` faites : « Heure de fin » dans la colonne de l'horaire,
  « Décaler » en contour dans un formulaire (`discret`), pilules avec l'autre nom (« Salle Fidélité · 小班 »). Laissés :
  « Horaire » → « Heure de début » quand une salle est choisie ; captures en `fr-FR` (le navigateur de capture affiche
  « 07:00 PM ») ; thème sombre, formulaire de réunion et chinois non regardés. Suite : T4b **non lancée** par T4a
  (limite de profondeur des sessions atteinte, 8) ; demandée au pilote, consigne dans le message.
- 16/11/2026 : **T4b faite, lot 4 fini** (orchestratrice T4b, codée par elle-même). Fiche : `lieuAffiche(e)`
  (`src/lib/salles/salles.ts`, avec `nomAvecAutre`) montre la salle avec son autre nom (« Salle Amour · 大班 ») à la
  place du lieu écrit, dans la carte de la fiche, la ligne compacte de la liste et l'en-tête d'une réunion
  (`EnTeteReunion`). Formulaires : « Horaire » devient « Heure de début » quand une salle est choisie
  (`evenements.form.heureDebut`, 开始时间). **Déplacer au calendrier (U8)** : à « Déplacer », un évènement ou une réunion
  qui porte une salle relit les occupations du jour visé (`verifierSalle`, mêmes heures, hors lui-même) ; prise, une
  phrase rouge nomme l'occupant (« Salle Fidélité est prise : Cours de chinois, 18:00 – 19:00. »), « Déplacer » se
  grise, rien ne s'écrit ; une autre date l'efface. Décision déléguée (session T4b, 16/11) : refus seul, sans
  « Décaler » ni autre salle, le déplacement ne changeant que la date ; lecture impossible = refus
  (`salles.formulaire.echec`), comme au formulaire. **Règle changée** : `salleEvenementValide()` dans
  `firestore.rules` (`salle` absente, null ou une des neuf) à la création et à la modification d'un évènement ;
  miroir écrit au-dessus de `canEditEvenement` (`src/lib/access.ts`) ; le client n'offre que `SALLES` (`estSalleId`).
  **Timothée doit publier `firestore.rules` à la main** (avec celles du lot 3) avant de pousser le lot 4 sur `main`.
  Tests : `salles-evenement` +4 tests (fiche d'un évènement, d'une réunion, déplacement refusé puis accepté, 中文) et
  « Heure de début » dans les T4a ; `equipes-reunions` : la regex de `allow create` suit `salleEvenementValide`.
  Fin de lot : `salles-*`, `evenements`, `reunions`, `equipes-reunions`, `pages-en-grand-evenements`,
  `calendrier-deplacer` : 1 067 verts, 128 sautés, 7 échecs (regex des rules, et trois lenteurs sous charge) en
  16 min 10 s ; `calendrier` filtré (évènement, réunion) : 129 verts, 1 sauté, 1 min 35 s ; les 7 rejoués : 51 verts
  (spec `salles-evenement` entière), 1 min 19 s (≈ 19 min de tests). tsc et lint propres (0 erreur) ; police
  chinoise refaite (inchangée). Regard aux quatre dispositions et à 1 440 px (`fr-FR`) : fiche, en-tête de réunion,
  formulaire, refus du déplacement ; rien à reprendre (les champs d'heure restent en « 03:00 PM » dans le navigateur
  de capture). Pas de `critique-design` : seuls des textes changent. Non regardés : thème sombre. **Lot 5** : après
  Noël 2026, spec à écrire ; aucune session lancée.
- 16/11/2026 (soir) : **lot 5 avancé, sur décision de Timothée** (« tu peux modifier et je reporterai tout à la main ») :
  la Scène bascule maintenant, Noël compris, sans reprise automatique. Spec du lot écrite (AR19 à AR23, T5a à T5c) ;
  le lot AQ est fini, `src/app/evenements/scene/` est libre. T5a lancée dans une session neuve.
- 16/11/2026 (soir) : Timothée précise : « tu peux tout modifier vu que je vais reporter à la main ». AR22 réécrite :
  plus de créneaux fixes, la Scène se réserve à l'heure qu'on veut, la page de la fête montre ses fenêtres libres.
- 16/11/2026 (soir) : AR23 retirée sur demande de Timothée (« tu peux enlever les trucs à reporter ») : pas de liste
  « À reporter », pas de `depuisCreneau` ; il reporte d'après ses captures.
- 16/11/2026 (nuit) : **T5a faite** (session orchestratrice, codée par elle-même : les agents du dépôt n'étaient pas
  chargés). `Reservation` gagne `fete`, `qui`, `note`, `libre` (pas de `depuisCreneau`, AR23) ;
  `listReservationsDeFete` (`fete ==`, sans `orderBy` : index automatique, tri côté client). `listCreneaux`,
  `createCreneau`, `updateCreneau`, `deleteCreneau` lisent et écrivent `reservations/{id}` (`salle: "scene"`,
  `fete` = id du programme, `dimanche` ↔ `date`, `pour` = libellé français des `qui`, 60 caractères), même signature ;
  le PATCH de `programmes.ts` n'écrit plus `null` pour un champ `undefined` (il le retire, ex. `libre`). Salles :
  `SourcesSalles.scene` ne porte plus que les programmes (`id` en plus) ; une réservation avec `fete` y reste un
  créneau de scène (quoi · qui, lien vers la fête, non modifiable depuis Salles, ignorée si l'édition est un
  brouillon). **Règle changée** : `reservable()` sortie de `match /programmes` (partagée, les anciens créneaux s'en
  servent toujours) ; `reservationValide()` : champs permis (`keys().hasOnly`), `fete` ⇒ `salle == 'scene'`, `qui`
  liste ; `feteReservable()` (coordination et gestionnaires de planning sans limite) à la création et à la
  modification, `fete` inchangée à la modification. Miroir : commentaires de `canReserverSalle`, `canEditReservation`,
  `canEditCreneau`, `canReserverPour` (logique inchangée). **Timothée publie `firestore.rules`** avant de pousser le
  lot 5 sur `main`. Encore sur les anciens créneaux jusqu'à T5c : rappels (`cron/reminders`) et `/api/scene/conflit`.
  Tests : `tests/salles-scene.spec.ts` (4 × 3 appareils) ; fixtures des specs voisines converties par
  `tests/helpers/creneauxScene.ts` (`creneauxEnReservations`) : `scene-*`, `programme-scene`, `salles-*`, `calendrier`,
  `calendrier-deplacer`, `tableau-de-bord`, `a-faire`, `audit-design-captures-2`. Specs de la Scène et `salles-*` sur
  trois appareils : 968 verts, 83 sautés, 17 échecs en 14 min 19 s (fixtures oubliées, règle modifiée en cours de
  route, lenteurs de `salles-evenement`) ; rejoués : 63 verts en 1 min 18 s ; `salles-liste` et `salles-grille` en
  tablette paysage et 1 440 px : 30 verts en 34 s (≈ 16 min de tests). tsc et lint propres (0 erreur). Aucun
  changement d'apparence : pas de regard ni de `critique-design`. T5b lancée.
- **T5b, première partie (session T5b, 16/11/2026)** : codée par la session elle-même (agents du dépôt non chargés, même
  méthode que `/tranche`). Fait : `saison.ts` sans grille ni `duree` (`fenetresLibres`, `plagesDuJour`, `dansUnePlage`,
  `lignesDuJour` avec lignes `libre` / `reserve` / `occupe`, `semainesDe` à une case par jour réservable, `compteJours`,
  `creneauxLibres` du Calendrier sur les fenêtres) ; page de la fête : « Libre 14:30 – 15:00 · 17:00 – 19:00 » par jour,
  l'emploi du temps fixe, Salles et les évènements en gris (`chargerAutresScene`, `charger.ts`), « Réserver » sur une
  fenêtre ouvre la seule feuille « de / à » pré-remplie, plus de bouton « Un autre moment » ; refus SA8 contre toutes
  les occupations du jour (`occupationsPourEvenement`, `RefusSalle`, « Décaler ») ; `duree` sortie de `SaisonForm`,
  du résumé et de `fetes.ts` ; « Hors grille » devient « Hors des plages » ; Salles : « Pendant la saison de <fête>, la
  Scène se réserve depuis sa page » et le lien (`saisonSceneDu`, `FeuilleReserver`). Décisions déléguées (session T5b,
  16/11) : la fenêtre touchée pré-remplit « de » et « à » en entier ; `libre: true` s'écrit quand la réservation sort
  des plages (un « autre moment », permis comme avant) ; « Déplacer » et « Modifier » ouvrent la même feuille ;
  l'aperçu de la saison au Back-Office ne lit que les réservations de la fête ; le Calendrier (« Déplacer » d'une
  réservation de scène) propose les fenêtres de la fête sans l'emploi du temps fixe (le refus à l'enregistrement de la
  page de la fête reste complet). Tests : `scene-autre-moment` réécrite (19 verts sur ordinateur) ; test du message
  dans `salles-scene` (vert). **Reste à T5b (session suivante)** : réécrire là où elles lisent la grille
  `scene-paques-noel` (37 échecs sur ordinateur), `scene-saison` (33), `programme-scene` (6), `scene-qui` (4),
  `salles-scene` (2 tests de T5a : « Réserver 10:00 – 11:00 » devient « Réserver 10:00 – 12:00 », etc.), voir
  `scene-des-fetes` ; **tsc rouge sur ces deux specs** (`compteCreneaux`, `grilleDuJour`, `duree`) jusqu'à leur
  réécriture ; puis trois appareils, regard sur les quatre dispositions et 1 440 px, `critique-design`. Tour sur
  ordinateur de huit specs : 195 verts, 82 échecs, 27 sautés en 8 min 30 s. Aucune règle changée.
- **16/11/2026, T5b, seconde partie (faite)** : specs de la Scène réécrites là où elles lisaient la grille, sans
  changement de `src/` hors d'un commentaire (`ResumeSaison.tsx`). Supprimés (grille seule) : les trois tests
  « grille : » et « une réservation pile sur un créneau prend sa place », « changer la durée met l'aperçu à jour »
  (`scene-saison`) ; « couvre 1 créneau, sans « aussi » », « à cheval sur deux créneaux », « la feuille « Un créneau
  dure » » (`scene-paques-noel`, ce dernier remplacé par la feuille « Jour J »). Adaptés : `compteJours`, fenêtres
  libres (« Libre 14:30 – 15:00 · 17:00 – 19:00 »), feuille « de / à » pour réserver, déplacer et modifier, « Hors des
  plages », résumé de saison sans « Un créneau dure » ; `programme-scene`, `scene-qui`, `salles-scene` (fenêtre
  10:00 – 12:00, puis « à » 11:00) ; `scene-des-fetes` inchangée. Fixtures : planning Google Sheets simulé vide
  partout (dimanches « ordinaires ») ; dans `scene-paques-noel`, le sketch 16:00 – 17:00 passe à 17:00 – 18:00 (il
  croisait le culte sinophone) et le chant EDD sort des plages (18:30 – 20:00). Décision déléguée (session T5b, 16/11) :
  les clés de langue devenues inutiles (`creneauxDuJour_*`, `saison.duree`) restent, à retirer avec `i18n-sync` au
  prochain passage sur les libellés. Tests : sept specs de la Scène sur les cinq projets, 1 026 verts, 4 échecs,
  119 sautés en 17 min 12 s ; les quatre (deux attentes téléphone, un planning non simulé sur tablette, un menu
  « Retirer » lent à 1 440 px) rejoués : verts (2 min 06 s). Regard à l'œil : téléphone, tablette paysage,
  1 440 px de la page de Noël, feuille « Réserver » de Salles avec le message de saison (capture
  `*-salles-feuille.png` ajoutée) : rien à reprendre. `critique-design` non lancé : l'agent du dépôt n'est pas chargé
  dans cette session. tsc vert, lint sans erreur. Aucune règle changée. Suite : T5c.
- **16-17/11/2026, T5c (faite, fin du lot 5)** : le cron des rappels (`sceneCreneaux`) lit les créneaux de la Scène
  dans `reservations/{id}` (filtre `in` sur `date` seul, puis `creneauxDuRappel` : salle `scene`, `fete` d'une édition
  affichée) ; plus rien ne lit `programmes/{id}/creneaux` (AR19, documents laissés tels quels). `creneauDeReservation`
  (`src/lib/scene/rappels.ts`) sert à `listCreneaux` et au cron. Conflit : la page de la fête et le Back-Office
  signalent par `signalerConflit` → `/api/salles/conflit` ; `/api/scene/conflit`, `src/lib/scene/conflit.ts` et
  `reportConflict.ts` retirés ; routes API : 20 (`CLAUDE.md`, référence). Décision déléguée (session T5c, 16/11) : un
  conflit sur la Scène garde le message et le lien de Salles (« Salles : chevauchement », `/evenements/salles`), où
  les deux réservations se voient. Tests d'abord : quatre nouveaux tests de `programme-scene` rouges, puis verts ;
  `evenements.spec` lisait encore un créneau de grille (« Réserver 14:00 – 15:00 ») : il lit une fenêtre libre.
  Fin de lot : 19 specs (Salles, Scène, Évènements, `eglise-entree`, `routes-bornes`, `back-office-coupe`) sur les
  cinq projets, ≈ 2 510 verts, 4 échecs, ≈ 37 min (en deux fois : le conteneur a redémarré en cours) ; rejeu (11 s) :
  vert sauf `back-office-coupe` « onglet Culte » sur ordinateur (« Ruth K. » aussi dans `pied-barre`, venu du mode
  louange, hors du lot : à reprendre par ce chantier). tsc vert, lint sans erreur. Aucune règle changée par T5c.
  **Reste à Timothée** : publier `firestore.rules` (champs de fête dans `reservations/{id}`, T5a) avant de pousser
  sur `main` ; reporter à la main les réservations de Noël ; clés `creneauxDuJour_*`, `saison.duree` à retirer avec
  `i18n-sync`.
- 17/11/2026 — **Demande de Timothée, pas encore codée** (capture de Salles, feuille « Réserver une salle », Scène
  choisie un mardi de la saison de Noël, bouton « Réserver » grisé) : « La scène doit être réservable hors noel et
  paques aussi ». Aujourd'hui la fin d'AR22 bloque la Scène dans Salles pendant la période d'une fête ouverte
  (`FeuilleReserver.tsx:113-114`, `pret` exige `!fete`) ; hors période elle se réserve déjà comme toute salle (AR21).
  **Proposition (session « Scène : créneaux et occupation des salles », attend le go)** : dans Salles, la Scène se
  réserve toujours ; pendant une saison, le message devient un conseil (« Pour une répétition de <fête>, réserve
  depuis sa page » et le lien) et ne grise plus « Réserver ». Une réservation faite depuis Salles n'a pas de champ
  `fete` : elle suit les règles de toute salle (AR21), ne passe donc ni par « Qui peut réserver » ni par la fermeture
  de la fête, et la coordination peut la supprimer (SA10). Fichiers : `FeuilleReserver.tsx`, `fr.json`, `zh-CN.json`,
  `tests/salles-scene.spec.ts` (bloc T5b, lignes ≈ 125-147). Aucune règle Firestore à changer.
- 17/11/2026 — La demande ci-dessus (Scène réservable pendant une saison) est **reprise par le lot AS** (`docs/spec-reserver-unique-fetes.md`, à écrire) : une seule feuille « Réserver » et Noël, Pâques dans l'onglet Évènements (Timothée, 17/11). La proposition ci-dessus n'est pas codée telle quelle. Planche : `docs/planches/planche-reserver-unique-fetes.html`.
