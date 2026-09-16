# Spec : lot 7 — Tâches par pôle

Lot 7 de `feuille-de-route.md` § 2, demandé le 14/09/2026 (§ 3.H : « selon la
date butoir, une notif ; quand DA a terminé le fond PPT, ça notifie la régie » ;
« que tout le monde soit autonome »). Entretien du 16/09/2026 en deux tours
(Q8 à Q15, puis Q24 à Q30), recommandations toutes acceptées. Arbitrage 12 de
la relecture (§ 7 : cible « régie » de la chaîne) tranché. Q12 révisée par
Timothée à la remise de la spec. **Go donné le 16/09/2026** (« Go pour tous
les lots 5, 7 et 8 »).

## Objectif

Chaque pôle (**DA, Média, Orga, Louange, Événement**) suit ses tâches dans
l'app : qui fait quoi pour quand, rappels avant l'échéance, et quand une tâche
est faite, **la suite est prévenue** (le pôle suivant ou la régie du
dimanche). Les réunions de pôle vont dans le calendrier des évènements.

Réussite : Timothée crée « Fond PPT » (DA, chaque semaine, vendredi, prévenir
la régie du Culte Francophone), la coche faite, et la régie du dimanche
suivant reçoit la notification ; la tâche de la semaine suivante apparaît.

## Ce que le code montre (16/09/2026)

- `types/user.ts` : `POLES = ["evenement"]`, attribués par un admin
  (`admin/page.tsx`, cases à cocher déjà en place) ; `isCoordination` (client
  et règles) teste `evenement` seulement — ajouter des pôles ne donne aucun
  droit de coordination. Un membre ne peut pas se donner un pôle (règle
  `users`).
- La régie de service d'un jour est connue par le planning :
  `servantsForDate` + `isOnDutyRegie` (`presentationLink.ts`, lot 2), par
  catégorie (Culte Francophone, Intergroupe, Interfranco, Campus matin / soir).
- Rappels : un seul cron quotidien (08:00 UTC, Hobby = 2 crons max, un seul
  déclaré) ; `cron/reminders` envoie **une notification par personne et par
  échéance** (J-7, J-3, J-1 d'une date de service), clés `notifLog` pour ne
  jamais doubler ; langue dans `notifPrefs/{uid}.lang`.
- Préférences : `NOTIF_TYPES = reminders, setlists, annonces, evenements` ;
  cloche : `BellKind` (`manual`, `reminder`, `broadcast`, `presentation`,
  `scene`, `evenement`).
- Évènements (lot 6) : champ `pour` = `eglise` ou une section ;
  `canSeeEvenement` / `canCreateEvenement` + règles `evenements/{id}` ; rappel
  de la veille aux inscrits (`evenements/rappel.ts`).
- Navigation : barre du bas à cinq onglets ; page Moi en lignes groupées.

## Décisions (entretien du 16/09/2026)

| # | Décision |
| --- | --- |
| Q8 | Supposition retenue : surtout des **tâches hebdomadaires liées au dimanche**, et une **réunion par pôle par mois**. |
| Q9 | Pôles cochés par un admin dans le profil, plusieurs possibles. **Louange n'est pas coché** : membre = a au moins un rôle de service. |
| Q10 | Une tâche faite prévient **un pôle** (tous ses membres) **ou la régie du dimanche** d'après le planning. |
| Q11 | Une tâche peut **se répéter** ; chaque fois a son propre état. |
| Q12 | ~~Tous les connectés voient toutes les tâches~~ **Révisée le 16/09/2026** : « une personne qui n'est pas connectée ou qui n'est pas dans un pôle ne voit pas les tâches des pôles », puis « son pôle seulement » : **chacun voit les tâches de ses pôles**, les admins voient tout. Les membres du pôle (et les admins) créent, modifient, cochent. |
| Q13 | Réunion = **évènement du calendrier réservé au pôle**. |
| Q14 | Pas de sixième onglet : « Mes tâches » dans Moi (avec le nombre à faire), page « Tâches » par pôle ; sur ordinateur, entrée « Tâches » dans la barre du haut pour les membres d'un pôle. |
| Q15 | Rappels à J-3 et J-1 au responsable (au pôle entier sans responsable), et un seul rappel le lendemain de l'échéance si pas faite ; **dans la notification du jour**, jamais deux le même jour. |
| Q24 | Tâche = titre, pôle, responsable facultatif (membre du pôle), échéance (un jour, sans heure), état à faire / faite (qui, quand), lien et note facultatifs, « Quand c'est fait, prévenir » facultatif. Pas d'état « en cours ». |
| Q25 | Rythmes : chaque semaine (jour choisi), toutes les deux semaines, chaque mois (« le 1er dimanche du mois »). |
| Q26 | Une fois ratée **disparaît quand la suivante arrive**. Une tâche apparaît 7 jours avant son échéance. |
| Q27 | La tâche indique le service (Culte Francophone par défaut, Intergroupe, Interfranco, Campus) ; on prévient **la régie de ce service le dimanche qui suit l'échéance** ; sans régie reliée à un compte, celui qui coche voit « aucune régie reliée ». |
| Q28 | « Nouvelle tâche : … » quand quelqu'un d'autre te nomme responsable ; rien pour les fois suivantes ; préférence « Tâches ». |
| Q29 | Réunion de pôle : créée par un membre du pôle, visible des membres du pôle et des admins, jamais du calendrier public, **sans inscription**, rappel la veille **à tous les membres du pôle**. |
| Q30 | Page d'un pôle : En retard · Cette semaine · Plus tard · Faites (30 derniers jours). « Mes tâches » : à faire seulement, les miennes et celles de mes pôles sans responsable. |

## Règles de calcul (fonctions pures, `src/lib/taches/`)

- **Échéances d'une tâche répétée** : à partir de sa date de début, chaque
  semaine au jour choisi, toutes les deux semaines, ou le N-ième jour J du
  mois (N = 1 à 4 ou « dernier »).
- **Fois visible** : de 7 jours avant l'échéance jusqu'à ce qu'elle soit
  cochée. Une fois non cochée **disparaît quand la fois suivante devient
  visible**, mais jamais avant la fin du lendemain de son échéance (le jour du
  rappel « en retard »). Pour une tâche hebdomadaire, la fois ratée est donc
  visible « en retard » le lendemain, puis disparaît. Une **tâche unique**
  reste en retard jusqu'à ce qu'on la coche ou la supprime.
- **Groupes** : En retard (échéance passée, pas faite, encore visible) ;
  Cette semaine (échéance d'aujourd'hui à dimanche) ; Plus tard ; Faites
  (cochées depuis 30 jours).
- **Membres d'un pôle** : `poles` contient l'id ; Louange = `serviceRoles`
  non vide.
- **Régie du dimanche** : premier dimanche **strictement après** l'échéance
  (le dimanche même si l'échéance tombe un samedi) ; servants `regie` de la
  catégorie choisie ; comptes reliés par le nom de planning. Campus : matin et
  soir.

## Données

- `users/{uid}.poles` : `POLES` devient `["da", "media", "orga",
  "evenement"]` ; libellés DA, Média, Orga, Événement ; « louange » est un pôle
  virtuel (jamais stocké).
- `taches/{id}` : `titre`, `pole` (`da` · `media` · `orga` · `louange` ·
  `evenement`), `responsableUid` (ou `null`), `echeance` (AAAA-MM-JJ : la
  seule échéance d'une tâche unique, la première d'une tâche répétée),
  `repetition` (`null` ou `{ rythme: "semaine" | "2semaines" | "mois", rang?:
  1–4 | -1 }`, le jour de la semaine étant celui de `echeance`), `lien`,
  `note`, `prevenir` (`null`, `{ pole }` ou `{ regie: <catégorie> }`),
  `auteurUid`, `createdAt`, `updatedAt`.
- `taches/{id}/fois/{AAAA-MM-JJ}` : `faite: true`, `parUid`, `parNom`, `le`.
  Décocher = supprimer le document.
- Règles `firestore.rules` **et** `access.ts` (miroir `isPoleMember(pole)`) :
  **lecture, création, modification, suppression** de la tâche et de ses fois
  par un membre du pôle ou un admin — filtrage **côté serveur** (les requêtes
  filtrent sur `pole`), contrairement aux setlists. Évènement de pôle :
  `pour` = `pole:<id>` ; lecture connectés (comme les sections, filtrage
  client), création par un membre du pôle (`pour.split(':')[1]`), sans
  inscription.

## Ce qui sera construit — quatre tranches

### T1 — Pôles, tâches uniques, page Tâches

- `types/user.ts`, admin : trois pôles de plus (cases déjà là).
- `src/lib/taches/` (pur : membres, groupes), `src/lib/firebase/taches.ts`
  (REST, comme les setlists), `src/types/tache.ts`.
- Pages : `/taches` (mes pôles ; tous pour un admin ; sinon rien à voir),
  `/taches/[pole]` (quatre groupes, bouton « Nouvelle tâche » pour
  les membres), formulaire en feuille, case « faite » sur chaque ligne.
- Moi : ligne « Mes tâches » avec le nombre à faire ; barre du haut sur
  ordinateur : « Tâches » pour les membres d'un pôle.
- Règles + `access.ts`.

### T2 — Répétition

- Choix du rythme dans le formulaire ; calcul des échéances et de la fois
  visible ; cocher une fois = son document `fois/{date}`.

### T3 — Notifications

- Préférence `taches` (« Tâches ») dans `NOTIF_TYPES` et Réglages ;
  `BellKind` `tache`.
- `/api/taches/assigne` (Admin SDK) : « Nouvelle tâche : <titre> » au
  responsable nommé par quelqu'un d'autre ; clé `notifLog` par tâche et par
  responsable.
- `/api/taches/fait` : après la coche, prévient le pôle ou la régie du
  dimanche ; réponse `{ notified, linked }` → ligne d'état « Régie prévenue. »,
  « Pôle Média prévenu. » ou « Personne n'a été prévenu : aucune régie reliée
  à un compte. » ; clé `notifLog` par fois.
- `cron/reminders` : lignes « À faire : Fond PPT (DA) — vendredi » à J-3 et
  J-1, « En retard : … » le lendemain ; **ajoutées à la notification du jour
  de la personne** s'il y en a une, sinon une notification « Rappel de
  tâches » ; FR / 中文.

### T4 — Réunions de pôle

- `EvenementForm` : « Pour » propose les pôles de la personne ; un évènement
  de pôle masque les inscriptions.
- `canSeeEvenement` / `canCreateEvenement` + règles : `pole:<id>`.
- Calendrier : visible des membres du pôle et des admins, jamais du
  calendrier public.
- Rappel de la veille : à **tous les membres du pôle** (pas aux inscrits).

## Hypothèses

1. « Mes tâches » et l'entrée de la barre du haut ne s'affichent qu'aux
   membres d'un pôle et aux admins ; `/taches` ouvert par un autre connecté
   dit qu'il n'est dans aucun pôle.
2. Une tâche répétée garde le même responsable à chaque fois ; le changer vaut
   pour les fois à venir.
3. Modifier le rythme d'une tâche répétée ne touche pas les fois déjà
   cochées.
4. Un pôle prévenu = tous ses membres **sauf** celui qui coche.
5. Le cron regroupe désormais par personne **et par jour** (et non plus par
   personne et par date de service) quand une ligne de tâche s'y ajoute ; les
   rappels de service sans tâche restent identiques.

## Tests (Playwright, `tests/taches.spec.ts`, trois appareils)

Écrits d'abord, vus en échec, puis verts. Firestore et routes simulés
(`page.route`, session factice), comme `tests/evenements.spec.ts`.

- Pur : échéances (semaine, deux semaines, 1er dimanche, dernier dimanche,
  changement de mois) ; fois visible et disparition d'une fois ratée
  (hebdomadaire, mensuelle, unique) ; groupes ; membres de Louange ; dimanche
  de la régie (échéance vendredi, samedi, dimanche).
- Droits : `isPoleMember` pour membre, non-membre, admin, Louange.
- Interface : un membre crée, coche, décoche ; un membre d'un autre pôle et un
  connecté hors pôle ne voient pas les tâches ;
  « Mes tâches » compte juste ; les trois retours après la coche (régie
  prévenue / pôle prévenu / aucune régie reliée).
- Cron : message regroupé (service + tâche le même jour) en FR et 中文.
- Réunion de pôle : invisible sans compte et pour un non-membre, visible pour
  un membre, sans inscription.

## Limites

- Toujours : permissions en double (`access.ts` + `firestore.rules`) ; aucun
  nouveau cron ; FR + 中文 ; trois appareils.
- Demander avant : un sixième onglet, une nouvelle dépendance, une tâche
  visible sans compte.
- Jamais : un pôle qui donne un droit de coordination ; deux notifications
  le même jour à la même personne pour des rappels.

## Après le code (à faire par Timothée)

- Publier `firestore.rules` dans la console Firebase.
- Cocher les pôles DA, Média, Orga des personnes concernées dans
  l'administration.

## Commandes

```bash
npm test -- tests/taches.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```
