# Spec : lot 13 — tâches, rythme annuel, « en cours » et relances

Demande de Christelle (WhatsApp, nuit du 17 au 18/09/2026, transmise en
captures par Timothée le 18/09) :

> « les tâches c'est tjrs les mêmes à dupliquer et à remettre à la bonne date
> butoir de l'an prochain etc » ; « et ça envoie notif au pôle concerné pour
> rappel de réaliser la tâche » ; « et le pôle dès qu'il a fait il peut cliquer
> que c'est en cours ou terminé » ; « et tant que c'est en cours, y'a des
> notifs ».

Timothée : « Sinon tu crées les taches et on fait des répétitions tous les
ans » — Christelle : « oui ! exactement ».

Statut : **tranché le 18/09/2026** (feuille de route § 2, lot 13, et § 3, Q7).
Lot 13 de l'ordre 10 → 17. Rien n'est codé : la spec attend le go.

## Ce que le code montre (18/09/2026)

- **La notification au pôle existe déjà.** `cron/reminders` envoie ses rappels
  de tâche `r.tache.responsableUid ? [r.tache.responsableUid] :
  membres(r.tache.pole)` (`src/app/api/cron/reminders/route.ts`, l. 113) :
  au responsable, ou à **tous les membres du pôle** quand la tâche n'en a pas,
  après filtrage par la préférence « Tâches » (`filterUidsByNotifPref`, l. 114).
  Rien à construire de ce côté.
- Les trois rappels ne sont **pas** J-3, J-1 et le jour J, comme le résume la
  feuille de route, mais **J-3, J-1 et le lendemain** de l'échéance
  (`src/lib/taches/messages.ts`, l. 42-46 : `addDays(today, 3)`,
  `addDays(today, 1)`, `addDays(today, -1)`). Le jour J, rien ne part.
- `Rythme = "semaine" | "2semaines" | "mois"` (`src/types/tache.ts`, l. 9) :
  pas d'année. Aucun bouton « dupliquer » n'existe nulle part : une tâche
  répétée n'est **jamais** copiée, ses échéances sont **calculées** à la volée
  par `echeancesDe` (`src/lib/taches/echeances.ts`, l. 34-53).
- « mois » ne garde pas le quantième mais le **N-ième jour de la semaine** :
  `nthWeekday` (l. 23-30) reprend le jour de la semaine de la première
  échéance et le rang 1 à 4, ou -1 pour le dernier (l. 39-47). Ce mécanisme
  existe donc déjà si l'on voulait « le 1er dimanche d'avril ».
- `Fois` = **faite, ou rien** (`src/types/tache.ts`, l. 40-47) : `date`,
  `parUid`, `parNom`, `le`. Le document `fois/{date}` **n'existe que si
  quelqu'un a coché** (`cocherFois`, `src/lib/firebase/taches.ts`, l. 114-122) ;
  décocher le **supprime** (`decocherFois`, l. 124-126). Il n'y a donc
  aujourd'hui nulle part où écrire « en cours ».
- `firestore.rules`, l. 117-119 : `match /fois/{date} { allow read, write: if
  signedIn() && isTachePole(pole); }`. **`write` couvre déjà la création** :
  créer le document plus tôt ne demande aucune règle nouvelle, donc **rien à
  republier dans la console Firebase**.
- `lignesDeTache` ne remonte que **62 jours en arrière**
  (`echeances.ts`, l. 71 : `addDays(today, -62)`) : une fenêtre taillée pour le
  rythme mensuel.
- Une seule notification par personne et par jour (lot 1c) : les lignes de
  tâche sont **ajoutées** au corps du rappel de service du jour
  (`corpsAvecTaches`, `cron/reminders`, l. 219) et ne partent seules qu'à
  défaut (l. 236-253).
- La clé anti-doublon est **par rappel et par destinataire** :
  `rappel-tache-${r.quand}-${pole}-${id}-${date}` (l. 112), sans le jour
  d'envoi. Telle quelle, une ligne « en cours » ne sortirait **qu'une fois**.
- `/api/taches/fait` refuse tant que le document n'existe pas (« Pas encore
  cochée », `src/app/api/taches/fait/route.ts`, l. 29-31), puis prévient le
  pôle suivant ou la régie du dimanche, une fois par (tâche, fois,
  destinataire).

## Décisions (Timothée, 18/09/2026)

| # | Décision |
| --- | --- |
| D1 | Rythme **« an »** ajouté à semaine / 2 semaines / mois. |
| D2 | **Pas de bouton « dupliquer »** : la tâche se régénère toute seule, comme les autres répétitions. « À remettre à la bonne date butoir de l'an prochain » devient : il n'y a rien à remettre. |
| D3 | **Trois états par échéance** : À faire → En cours → Terminé. |
| D4 | Relances : **aucune notification supplémentaire**. Une tâche « en cours » ajoute **une ligne** à la notification groupée du matin (« En cours depuis 3 jours : fond PPT »), et **seulement après l'échéance dépassée**. |
| D5 | La notification au pôle concerné **existe déjà** (voir ci-dessus) : ce lot n'y touche pas. |

**D4 va contre la lettre de la demande.** Christelle écrit « tant que c'est en
cours, y'a des notifs » ; le site n'enverra pas de notification de plus. La
règle du lot 1c est plus forte : **une seule notification par personne et par
jour**, tous rappels confondus (feuille de route § 5 : « Deux notifications de
rappel le même jour : intrusif »). Une tâche en retard depuis trois semaines
produirait sinon vingt et une notifications, et l'équipe couperait la
préférence « Tâches » — donc perdrait aussi les rappels J-3 et J-1, qui,
eux, servent. L'esprit de la demande est tenu : **tant que la tâche est en
cours et en retard, elle revient chaque matin sous les yeux du responsable**,
avec le nombre de jours. Ce qui change, c'est le véhicule, pas la fréquence.

## Tranché dans cette spec

| # | Décision | Pourquoi |
| --- | --- | --- |
| R1 | Une échéance annuelle tombe **le même jour du même mois chaque année** (10/12/2026 → 10/12/2027). Pas de N-ième jour de semaine. | `nthWeekday` existe, mais il ne résout pas Pâques : 5 avril 2026 (1er dimanche d'avril), 28 mars 2027 (4e dimanche de mars), 16 avril 2028 (3e dimanche d'avril). Aucune règle fixe ne tient. Offrir le rang donnerait une **fausse impression de justesse** sur les fêtes mobiles. Une échéance liée à une fête se règle par le lot 14 (tâche rattachée à un évènement, échéance relative « J-14 »), ou à la main une fois l'an. |
| R2 | **29 février** : les années non bissextiles, l'échéance tombe le **28 février** ; l'année bissextile suivante, elle revient au 29. | `Date.UTC(2027, 1, 29)` donne **2027-03-01** (vérifié) : sans bornage, une date butoir partirait *après* l'échéance voulue. Une échéance est une limite : on la ramène en avant, jamais en arrière. Le calcul part toujours de `echeance`, jamais de l'année précédente : aucune dérive. |
| R3 | L'état « en cours » vit dans le document **`fois/{date}`**, créé **dès le passage en « En cours »** — donc avant qu'on ait terminé. Champ `etat: "encours" \| "terminee"`. | C'est le seul endroit par échéance ; y ajouter l'état évite une seconde collection. Le document n'existait jusqu'ici qu'une fois coché (`cocherFois`) : ce lot le crée plus tôt. |
| R4 | **Aucune règle Firestore à changer ni à republier.** | `allow read, write: if signedIn() && isTachePole(pole)` (l. 117-119) couvre déjà `create`. Les champs ne sont pas contrôlés, ici comme ailleurs. |
| R5 | **Qui change l'état** : tout membre du pôle, et les admins — comme aujourd'hui pour cocher. Pas seulement le responsable. | Le miroir `isPoleMember` / `isTachePole` ne connaît que le pôle ; restreindre au responsable demanderait une règle nouvelle et bloquerait le remplaçant d'un absent. Le document garde **qui** a fait quoi (`parNom`), ce qui suffit à la confiance dans un outil interne. |
| R6 | **`prevenir` ne part qu'au passage en « Terminé »**, jamais en « En cours ». | La chaîne demandée au lot 7 est « quand DA a **terminé** le fond PPT, ça notifie la régie » : le pôle suivant ne peut rien commencer sur un travail en cours. `/api/taches/fait` refusera donc aussi une fois « en cours » (« Pas encore terminée », 400). |
| R7 | Les groupes de la page **restent quatre** : En retard · Cette semaine · Plus tard · Faites. Une fois « en cours » reste dans son groupe de date et porte la mention « En cours ». | Un cinquième groupe « En cours » **sortirait de « En retard »** une tâche commencée et en retard : exactement celle qu'il faut garder sous les yeux. Le groupe répond à « pour quand », l'état à « où ça en est ». |
| R8 | **Une fois « en cours » ne disparaît jamais** toute seule : elle reste jusqu'à ce qu'on la termine, qu'on la remette à faire, ou qu'on supprime la tâche. | La règle « une fois ratée disparaît quand la suivante arrive » (lot 7, Q26) existe pour ne pas empiler les oublis. Une fois commencée n'est pas un oubli : quelqu'un s'en occupe, et c'est elle que la ligne du matin relance. |

## Objectif

1. Une tâche qui revient **chaque année** se crée une fois et se régénère
   seule, sans rien dupliquer ni rien remettre à jour.
2. Un pôle dit **où il en est** : À faire, En cours, Terminé.
3. Une tâche **commencée et en retard** revient chaque matin dans la
   notification du jour, avec le nombre de jours — **sans une notification de
   plus**.

Réussite : Timothée crée « Fond PPT de Noël » (DA, chaque année, échéance
10/12/2026, prévenir la régie du Culte Francophone). Le 11/12/2026, personne
n'a rien fait : le rappel du matin dit « En retard : Fond PPT de Noël (DA),
pour hier ». Quelqu'un met la tâche « En cours » ; le 14/12 le rappel du matin
dit « En cours depuis 3 jours : Fond PPT de Noël (DA) », et la cloche ne
compte **qu'une** notification ce jour-là. Passée en « Terminé », la régie du
dimanche suivant est prévenue. Le 03/12/2027, la fois du 10/12/2027 apparaît
toute seule ; rien n'a été dupliqué.

## Modèle

### Types (`src/types/tache.ts`)

| Champ | Avant | Après |
| --- | --- | --- |
| `Rythme` | `"semaine" \| "2semaines" \| "mois"` | `… \| "an"` |
| `Repetition.rang` | 1 à 4, ou -1 (« mois ») | inchangé ; ignoré pour « an » |
| `Fois.etat` | — | `"encours" \| "terminee"` |
| `Fois.debutLe` | — | ISO du passage en « En cours » ; `""` si la fois a été terminée d'emblée |
| `Fois.parUid` / `parNom` / `le` | qui a coché, quand | qui a mis la fois dans son **état courant**, et quand |

- **Compatibilité** : un document du lot 7 n'a pas d'`etat` ; il se lit
  `"terminee"` (`fromFsFois`, `src/lib/firebase/taches.ts`, l. 34-42).
  **Aucune migration**, aucune règle à republier (R4).
- `Prevenir` : inchangé.

### Échéances (`src/lib/taches/echeances.ts`)

- **`echeancesDe`** gagne la branche `"an"` : une boucle par année à partir de
  l'année de `echeance`, en gardant le mois et le quantième, **borné au dernier
  jour du mois** (R2 : 29/02 → 28/02 les années non bissextiles). Le bornage
  est explicite, parce que `Date.UTC` déborde sur le mois suivant.
- **`lignesDeTache`** : le recul de 62 jours (l. 71) devient **400 jours pour
  une tâche annuelle**, 62 pour les autres. Sans cela, une échéance annuelle
  oubliée sortirait de la page au bout de deux mois, alors qu'aucune fois
  suivante ne vient la remplacer avant un an. Elle reste donc « En retard »
  jusqu'à ce que la fois de l'année suivante apparaisse, sept jours avant.
- **Fois avec document** : elle donne une ligne, quel que soit son état ; le
  balayage des échéances la saute, comme aujourd'hui. Les **terminées**
  restent 30 jours dans « Faites » ; les **en cours** restent sans limite de
  temps (R8).
- **`grouperLignes`** : « à faire » devient « pas de document **ou** document
  en cours » ; « faites » ne garde que `etat === "terminee"`. Les quatre
  groupes et leurs bornes de dates ne bougent pas (R7).
- **`aFairePour`** (« Mes tâches ») : même changement de filtre, donc une
  tâche en cours compte encore comme à faire.

### Rappels (`src/lib/taches/messages.ts`, `cron/reminders`)

- `RappelTache` gagne `quand: "encours"` et `depuis?: number` (jours entiers
  entre `debutLe` et aujourd'hui).
- `rappelsDuJour` :
  - J-3, J-1 et « retard » sont **inchangés**, et continuent de sauter toute
    fois qui porte un document — donc aussi une fois **en cours** : une tâche
    commencée ne reçoit plus « À faire » ni « En retard ». Quelqu'un s'en
    occupe, le rappel a fait son travail.
  - **Nouveau** : chaque fois `etat === "encours"` dont la date est
    **strictement passée** donne un rappel `"encours"`, **chaque matin**, tant
    qu'elle n'est pas terminée. Avant l'échéance, rien (D4).
- **Clé anti-doublon** : `rappel-tache-encours-<pole>-<id>-<date>-<aujourd'hui>`.
  Le jour d'envoi **doit** entrer dans la clé, sinon la ligne ne sortirait
  qu'une seule fois (l. 112). Les autres clés ne changent pas.
- **Destinataires** : inchangés — le responsable, ou tous les membres du pôle,
  préférence « Tâches ».
- **Véhicule** : `corpsAvecTaches`, donc la ligne s'ajoute au rappel de service
  du jour s'il y en a un, sinon à la notification « Rappel de tâches » déjà
  existante. **Aucun envoi nouveau, aucun cron nouveau** (Vercel Hobby).

## Écrans

### Ligne de tâche (`TacheLigne`)

- Le cercle devient un **bouton à trois états**, dans l'ordre : **À faire →
  En cours → Terminé → À faire**. Un seul contrôle : à 390 px la ligne porte
  déjà le cercle (40 px), le titre, le détail et le lien ; un second bouton ne
  tient pas.
- `role="checkbox"` est conservé, avec `aria-checked` à `false`, **`"mixed"`**
  et `true` : c'est exactement la case à trois états d'ARIA, et les tests du
  lot 7 qui visent `role="checkbox"` restent valables.
- Dessin, sans couleur nouvelle (palette gelée) : **À faire** = cercle au trait
  clair (inchangé) ; **En cours** = cercle au trait **foncé** avec un tiret
  centré (`Minus`), non rempli ; **Terminé** = cercle plein et coche
  (inchangé).
- Ligne de détail : l'état s'y ajoute — « mer. 10 déc. · Éloïse · Chaque année
  · En cours depuis 3 jours ». Une fois terminée garde « Faite par … ».

### Formulaire (`TacheForm`)

- Le choix « Répétition » gagne **« Chaque année »**, après « Chaque mois ».
- « Quelle semaine du mois » ne s'affiche toujours que pour « Chaque mois ».
- Sous le choix, en annuel : « Chaque année à la même date. » — pour qu'on ne
  cherche pas un réglage de rang.

### Pages

- **Page d'un pôle** : quatre groupes inchangés (R7). Une fois en cours et en
  retard reste en tête, dans « En retard », avec sa mention.
- **Page Tâches et « Mes tâches »** : le compte par pôle et la liste
  « À faire pour moi » comptent les fois en cours (elles ne sont pas finies).

### Libellés

`src/locales/fr.json` et `zh-CN.json`, sous `taches` :

| Clé | Français | 中文 |
| --- | --- | --- |
| `rythme.an` | Chaque année | 每年 |
| `anAide` | Chaque année à la même date. | 每年同一天。 |
| `etat.enCours` | En cours | 进行中 |
| `etat.terminee` | Terminé | 已完成 |
| `enCoursDepuis_one` | En cours depuis {{count}} jour | 进行中 {{count}} 天 |
| `enCoursDepuis_other` | En cours depuis {{count}} jours | 进行中 {{count}} 天 |
| `enCoursAujourdhui` | En cours depuis aujourd'hui | 今天开始 |
| `enCoursSansDate` | En cours | 进行中 |
| `commenceePar` | Commencée par {{nom}} | {{nom}} 已开始 |

Notifications (`src/lib/taches/messages.ts`, texte dans le code comme le
reste du lot 7) :

| Cas | Français | 中文 |
| --- | --- | --- |
| en cours depuis n jours | `En cours depuis 3 jours : Fond PPT (DA)` | `进行中 3 天：Fond PPT（美工）` |
| commencée aujourd'hui | `En cours depuis aujourd'hui : Fond PPT (DA)` | `今天开始：Fond PPT（美工）` |
| sans `debutLe` (fois d'avant ce lot) | `En cours : Fond PPT (DA)` | `进行中：Fond PPT（美工）` |

Retour après une coche : inchangé (« Régie prévenue. », « Pôle Média
prévenu. », « Personne n'a été prévenu : aucune régie reliée à un compte. »),
et il ne s'affiche qu'au passage en **Terminé** (R6).

## Ce qui sera construit — trois tranches

### A1 — Rythme annuel

- `Rythme` gagne `"an"` ; `echeancesDe` gagne sa boucle par année avec le
  bornage du 29 février ; recul de 400 jours dans `lignesDeTache` pour une
  tâche annuelle.
- `TacheForm` : choix « Chaque année » et son aide ; `TacheLigne` : libellé du
  rythme.

### A2 — Trois états

- `Fois.etat` et `Fois.debutLe` ; lecture compatible (`fromFsFois`).
- `cocherFois` devient `changerEtat` (créer en « en cours », passer en
  « terminée », revenir à « à faire » = supprimer le document).
- `TacheLigne` : cycle à trois états, `aria-checked` à trois valeurs, mention
  dans le détail.
- `grouperLignes`, `aFairePour`, compte de la page Tâches : une fois en cours
  reste à faire.
- `/api/taches/fait` : refus « Pas encore terminée » tant que l'état n'est pas
  `terminee` ; la page n'appelle la route qu'au passage en Terminé.

### A3 — Ligne de relance du matin

- `rappelsDuJour` : `quand: "encours"` après l'échéance, et saut des lignes
  J-3 / J-1 / retard pour une fois commencée.
- `ligneRappelTache` : les trois textes FR / 中文.
- `cron/reminders` : clé `rappel-tache-encours-…-<aujourd'hui>`, ligne ajoutée
  au message du jour par `corpsAvecTaches`. Aucun envoi nouveau.

## Tests (Playwright, `tests/taches.spec.ts`, trois appareils, écrits avant le code)

Écrits d'abord, **vus en échec**, puis verts. Firestore et routes simulés
(`page.route`, session factice), comme le lot 7.

- **Purs, rythme annuel** : trois échéances de suite à partir du 10/12/2026 ;
  une tâche annuelle créée le 29/02/2028 donne 28/02/2029, 28/02/2030,
  29/02/2032 ; une échéance annuelle oubliée reste « En retard » six mois plus
  tard, puis laisse la place sept jours avant celle de l'année suivante.
- **Purs, états** : un document « en cours » n'est pas dans « Faites » et
  reste dans « En retard » ; il ne disparaît pas quand la fois suivante
  apparaît ; une fois terminée sort de « À faire » et reste 30 jours dans
  « Faites » ; « Mes tâches » compte une fois en cours.
- **Purs, rappels** : rien avant l'échéance pour une fois en cours ; une ligne
  le lendemain, puis encore le surlendemain (deux jours de suite, clés
  différentes) ; pas de ligne « En retard » en plus ; « depuis 1 jour » /
  « depuis 3 jours » / « depuis aujourd'hui » / sans `debutLe`, en FR et en
  中文 ; la ligne s'ajoute au rappel de service du jour (une seule
  notification).
- **Interface** : un membre du pôle touche le cercle une fois (En cours,
  `aria-checked="mixed"`, aucune route appelée), deux fois (Terminé, la route
  part, « Régie prévenue. »), trois fois (À faire, le document est supprimé) ;
  la ligne affiche « En cours depuis … » ; le formulaire propose « Chaque
  année » et n'affiche pas le rang ; une tâche annuelle enregistrée se relit.
- **Captures regardées à l'œil**, ordinateur, téléphone et tablette : page d'un
  pôle avec les trois états côte à côte, et le cercle « en cours » à 390 px.

## Hors périmètre (tranché)

- **Une notification de relance** tant que la tâche est en cours : écartée le
  18/09/2026 (D4, feuille de route § 5).
- **Un bouton « dupliquer »** une tâche ou une année de tâches : écarté (D2).
- **Le N-ième jour de semaine pour l'annuel** (« le 1er dimanche d'avril ») :
  écarté (R1) ; ne résout pas les fêtes mobiles.
- **Une tâche rattachée à un évènement** et une échéance relative
  (« J-14 ») : c'est le **lot 14**, pas celui-ci.
- **Un état « bloqué » ou un pourcentage d'avancement** : non demandé.
- **Un historique des changements d'état** : le document garde le dernier
  état, qui l'a mis et quand ; rien de plus.
- **Restreindre le changement d'état au responsable** : non (R5).

## Limites

- Toujours : aucun cron nouveau (Vercel Hobby, un seul déclaré) ; une seule
  notification par personne et par jour ; FR + 中文 ; trois appareils ; un
  commit par lot.
- Demander avant : une notification hors du rappel du matin ; une préférence
  de notification nouvelle ; un cinquième groupe sur la page d'un pôle.
- Jamais : deux notifications le même jour à la même personne pour des
  rappels ; prévenir le pôle suivant sur une tâche seulement commencée.

## Après le code

- Rien à publier dans la console Firebase (R4).

## Commandes

```bash
npm test -- tests/taches.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la spec attend le go de Timothée.
