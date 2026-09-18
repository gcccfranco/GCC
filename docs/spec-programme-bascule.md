# Spec : lot 12 — Noël / Pâques : archivage et bascule automatiques

Demande de Timothée, 18/09/2026 :

> « il faudrait peut-être avoir un onglet Noel et Paques et quand les dates sont
> passés ça mets un petit message et ça cache tout ce qui est réservation de la
> scène et le programme. T'en pense quoi ? »

Statut : **spec écrite le 18/09/2026, rien n'est codé, en attente du go.**
Suite du lot 3 bis (`spec-programme-scene.md`), lot 12 de
`feuille-de-route.md` § 2. Un commit pour le lot.

## Ce que le code montre (18/09/2026)

- **Le programme courant, c'est le programme `visible`** : `SceneClient.tsx`
  l. 58 (`programmes.find((p) => p.visible)`) et `EvenementsTabs.tsx` l. 32 font
  le même calcul chacun de leur côté. L'onglet prend le nom de ce programme
  (l. 35) ; sans programme affiché, seule la coordination voit l'onglet, nommé
  « Scène » (l. 34). `visible: boolean` est déclaré dans `types/programme.ts`
  l. 33 (« Onglet affiché à tous les connectés »).
- **Un seul programme affiché à la fois, tenu par des écritures** : `show()`
  (`SceneClient.tsx` l. 66-70) masque tous les autres avant d'afficher, et la
  création fait pareil puis crée le programme `visible: true` (l. 80-81).
- **La disparition du volet Entraînements après le dernier dimanche réservable
  existe déjà, et c'est un calcul** : `reservationsClosed(today, jourJ)`
  (`lib/scene/dimanches.ts` l. 35-37) s'appuie sur `lastSundayBefore` (l. 27-31)
  et sur `todayIso()` (l. 40-43), qui lit l'horloge du navigateur — donc
  l'horloge simulée des tests. `SceneClient.tsx` l. 93-94 s'en sert pour forcer
  le volet « programme ». Aucune écriture, aucune tâche planifiée.
  **Après le jour J, rien ne se passe** : l'onglet reste, avec ses réservations,
  jusqu'à ce qu'Alice le masque à la main.
- **Le contrôle de chevauchement est borné au programme courant** : `overlaps()`
  (`dimanches.ts` l. 46-51) compare deux créneaux, et on ne lui donne que les
  créneaux du programme affiché — `fetchAll` ne lit que ceux-là
  (`SceneClient.tsx` l. 30-34), le marquage rouge les parcourt
  (`Entrainements.tsx` l. 45) et la relecture d'avant écriture n'interroge que
  `listCreneaux(programme.id)` (l. 53-55).
- **Un membre ne peut pas écrire `visible`** : `firestore.rules` l. 122-124,
  `allow create, update, delete: if isCoordination()` (`isCoordination()`
  l. 96-98). Seul le navigateur d'Alice ou d'un admin peut modifier un programme.
- `listProgrammes()` (`firebase/programmes.ts` l. 109-111) renvoie **tous** les
  programmes, masqués compris, **par jour J croissant**. `updateProgramme`
  (l. 126-129) écrit champ par champ (updateMask) ; `deleteProgramme`
  (l. 132-136) supprime aussi les créneaux.
- La liste « Programmes masqués » = `programmes.filter((p) => !p.visible)`
  (`SceneClient.tsx` l. 59), rendue l. 173-202 avec Afficher / Modifier /
  Supprimer.
- `OrdrePassage.tsx` prend un `canEdit` : il sait déjà s'afficher en lecture
  seule. `ProgrammeForm.tsx` l. 24 ne valide qu'un programme à la fois
  (`debut < jourJ`), rien entre programmes.
- `SectionTabs.tsx` (l. 13-15 et 47-52) ne connaît qu'une liste
  `{ href, label, color }` : **rien à y changer**, le nom de l'onglet vient de
  `EvenementsTabs`. `evenements/layout.tsx` l. 10 le monte au-dessus de toute la
  section ; `scene/page.tsx` protège la page (`RequireAuth`).
- **Le cron lit `visible` côté serveur** : `sceneCreneaux`
  (`api/cron/reminders/route.ts` l. 79) fait
  `.where("visible", "==", true)`. Si l'affichage devient un calcul, ce filtre
  ne désigne plus le même programme : à reprendre (tranche B3).
- Les tests de la scène simulent le temps avec
  `page.clock.setFixedTime(new Date(today + "T10:00:00"))` **avant**
  `signInAs` (`tests/programme-scene.spec.ts` l. 124-127, helper `openNoel`),
  et testent les fonctions pures directement (l. 27-37). Le test l. 67 attend
  `visible: true` à la création ; le test l. 137-142 vérifie la clôture des
  réservations.

## Décisions (18/09/2026, à ne pas rouvrir)

| # | Décision |
| --- | --- |
| D1 | **Un seul onglet et un seul programme affiché à la fois.** Raison : `overlaps()` (`lib/scene/dimanches.ts`) ne compare que les créneaux du programme courant (`programmes/{id}/creneaux`). Deux programmes affichés en même temps laisseraient deux groupes réserver la scène le même dimanche à la même heure **sans aucune alerte**. La scène est unique, le contrôle de chevauchement doit l'être aussi. |
| D2 | Après le jour J, l'onglet affiche pendant **7 jours** un message « Noël, c'est passé — merci à tous », **sans le programme ni les réservations**. |
| D3 | Passés ces 7 jours, le programme **s'archive** : il rejoint « Programmes masqués », consultable par la coordination. |
| D4 | S'il existe un autre programme dont les **réservations sont ouvertes** (sa date de début est atteinte), l'onglet **bascule tout seul dessus** et prend son nom (« Pâques »). |
| D5 | Alice (rôle « événement ») et les admins gardent **Afficher / Masquer** pour forcer. |
| D6 | Tests Playwright sur les **trois appareils**, écrits avant le code. |

## Questions tranchées dans cette spec (recommandations, à confirmer par le go)

| # | Question | Réponse retenue | Pourquoi |
| --- | --- | --- | --- |
| Q1 | Calcul à l'affichage ou écriture de `visible` ? | **Calcul.** Aucune écriture, aucune règle Firestore à changer, aucun cron. `visible` garde son sens et ses deux boutons, mais devient un **épinglage** de la coordination, pas la seule source de l'affichage. | Une bascule écrite ne pourrait venir que du navigateur d'Alice : `firestore.rules` l. 124 interdit à un membre d'écrire un programme. L'onglet changerait donc de nom le jour où Alice ouvre la page, pas le 1er janvier. Un cron est exclu : Vercel Hobby n'en autorise que deux, un seul est déclaré, et il tourne « à l'heure ± 1h ». Le code a déjà exactement ce mécanisme : `reservationsClosed` fait disparaître le volet Entraînements sans rien écrire, et se teste avec `page.clock`. Enfin, un calcul ne peut pas laisser la base dans un état faux. |
| Q2 | Deux programmes ont leurs réservations ouvertes en même temps | Le **jour J le plus proche** gagne (`listProgrammes` trie déjà par `jourJ` croissant). L'autre attend dans « Programmes masqués », avec la mention « En attente ». Alice force avec « Afficher ». | La scène est unique (D1) : il faut choisir. L'échéance la plus proche est celle qu'on répète en premier. |
| Q3 | Ce que voit la coordination pendant les 7 jours | Le **même message** que les membres, plus : ses boutons habituels (« Modifier le programme », « Masquer », « Nouveau programme »), la ligne « Ce programme s'archivera le 31 décembre », et un dépli **« Voir l'ordre de passage »** (lecture seule). | Un seul écran pour tout le monde, moins de surprises. Le dépli lui laisse relire ce qu'elle a écrit sans remettre le programme devant les membres. |
| Q4 | Ce que devient un programme archivé | Il **reste en base**, créneaux compris, dans « Programmes masqués » avec le badge « Archivé » et le même dépli « Voir l'ordre de passage ». **Rien ne se supprime tout seul** ; « Supprimer » reste manuel (`deleteProgramme`, créneaux compris). | L'ordre de passage est la brochure de l'année : il sert de modèle l'année suivante. Une suppression automatique serait irréversible pour gagner quelques kilo-octets. |
| Q5 | Pendant les 7 jours, personne ne peut réserver pour le programme suivant | **Accepté.** Le message a la priorité sur sa semaine ; la bascule se fait ensuite. Si c'est gênant une année, Alice presse « Afficher » sur le programme suivant. | Sept jours, une fois par programme, contre un écran qui dit deux choses à la fois. |
| Q6 | Un programme créé est-il encore affiché d'emblée ? | **Non.** Un programme se crée `visible: false` et ne masque plus les autres ; il apparaît tout seul quand ses réservations ouvrent. « Afficher » l'épingle tout de suite. | Aujourd'hui, créer « Pâques » en novembre **vole l'onglet** à Noël (l. 80-81). Avec la bascule, la date d'ouverture suffit. Change le test l. 67. |
| Q7 | Que devient le nom de l'onglet pendant les 7 jours ? | Il reste **« Noël »**. | Le message parle de Noël. L'onglet ne change de nom qu'à la bascule. |

## Objectif

1. Après le jour J, l'onglet **remercie** au lieu de laisser traîner des
   réservations périmées.
2. Une semaine plus tard, il **s'efface** de lui-même : plus d'onglet pour les
   membres tant qu'il n'y a rien à préparer.
3. Quand le programme suivant s'ouvre, l'onglet **revient tout seul**, sous son
   nom, sans que personne ne coche quoi que ce soit.
4. La coordination garde la main : Afficher, Masquer, Modifier, Supprimer.

**Réussite** : la base contient « Noël » (jour J 24/12/2026, réservations au
01/10/2026) et « Pâques » (jour J 05/04/2027, réservations au 04/01/2027) ;
**aucune écriture n'est faite** (`db.writes` vide) ; la même page, ouverte avec
l'horloge simulée, montre

| Date | Membre connecté |
| --- | --- |
| 20/12/2026 | onglet « Noël », volets Entraînements et « Programme Noël » |
| 24/12/2026 | onglet « Noël », ordre de passage seul (clôture déjà codée) |
| 25/12/2026 et 31/12/2026 | onglet « Noël », message « Noël, c'est passé — merci à tous ! », ni bouton « Réserver un créneau » ni ordre de passage |
| 01/01/2027 | **plus d'onglet** ; la coordination voit « Scène » et Noël « Archivé » |
| 04/01/2027 | onglet **« Pâques »**, ses dimanches (du 10 janvier au 4 avril), prêt à réserver |

## Modèle

**Aucun champ nouveau, aucune règle Firestore à publier.** `programmes/{id}`
garde `nom`, `jourJ`, `debut`, `visible`, `passages`. Seul le **sens** de
`visible` se précise : « épinglé par la coordination », au lieu de « le seul
affiché ».

Trois fonctions pures s'ajoutent à `src/lib/scene/dimanches.ts`, à côté de
`reservationsClosed` :

| Fonction | Rôle |
| --- | --- |
| `archiveDate(jourJ, jours = 7)` | ISO du jour J + 7 (24/12/2026 → 31/12/2026). |
| `programmeState(p, today)` | `"soon"` (today < `debut`) · `"open"` (`debut` ≤ today ≤ `jourJ`) · `"passed"` (`jourJ` < today ≤ `archiveDate`) · `"archived"` (today > `archiveDate`). |
| `currentProgramme(programmes, today)` | Le programme affiché, ou `null`. |

`currentProgramme`, dans l'ordre, sur la liste déjà triée par jour J croissant :

1. les programmes **archivés** sont écartés ;
2. le premier programme **épinglé** (`visible === true`) qui reste → c'est lui
   (le forçage d'Alice gagne, même avant l'ouverture des réservations) ;
3. sinon, le premier programme **ouvert** (`state === "open"`) → bascule
   automatique, jour J le plus proche d'abord (Q2) ;
4. sinon `null` : pas d'onglet pour les membres, « Scène » pour la coordination
   (comportement actuel).

L'état de l'écran découle de `programmeState(current, today)` : `"passed"` →
carte du message seule ; sinon → les volets d'aujourd'hui.

Conséquences :

- `SceneClient.tsx` l. 58 et `EvenementsTabs.tsx` l. 32 appellent **la même
  fonction** : la page et le nom de l'onglet ne peuvent plus diverger.
- « Programmes masqués » = **tous les programmes sauf le courant** (l. 59),
  avec un badge « Archivé » (`state === "archived"`) ou « En attente »
  (`state === "open"` non retenu, Q2).
- « Masquer » écrit `visible: false` comme aujourd'hui. Sur un programme
  **épinglé**, il le désépingle et la bascule reprend la main. Sur un programme
  choisi automatiquement, il n'aurait rien à écrire : le bouton **n'est pas
  affiché**, remplacé par la ligne « Choisi automatiquement : réservations
  ouvertes depuis le 4 janvier. » et le bouton « Modifier le programme » (pour
  reculer la date d'ouverture).
- Une page ouverte garde l'état de la veille jusqu'au rechargement, comme
  `reservationsClosed` aujourd'hui. `todayIso()` lit l'horloge de l'appareil.

## Écrans

### La carte « c'est passé » (jour J + 1 à jour J + 7)

Une seule carte, à la place des volets, aux couleurs de la scène
(`PLANNING_COLORS.scene`) :

- titre : **« Noël, c'est passé — merci à tous ! »**
- ligne : « Les réservations de la scène et le programme sont fermés. »
- si un programme suivant existe : « Prochain programme : Pâques, réservations à
  partir du 4 janvier. »
- coordination seulement : « Ce programme s'archivera le 31 décembre. » et le
  dépli « Voir l'ordre de passage » (lecture seule, `OrdrePassage`
  `canEdit={false}`).

Ni « Réserver un créneau », ni la bascule de volets, ni les dimanches, ni
l'ordre de passage pour les membres.

### Textes (FR et 中文)

| Clé | Français | 中文 |
| --- | --- | --- |
| `planning.scene.passed` | « {{nom}}, c'est passé — merci à tous ! » | 「{{nom}}」已经过去了——感谢大家！ |
| `planning.scene.passedHint` | « Les réservations de la scène et le programme sont fermés. » | 舞台预约和节目单已关闭。 |
| `planning.scene.nextSoon` | « Prochain programme : {{nom}}, réservations à partir du {{date}}. » | 下一个节目：{{nom}}，{{date}} 起可预约。 |
| `planning.scene.willArchive` | « Ce programme s'archivera le {{date}}. » | 此节目将于 {{date}} 归档。 |
| `planning.scene.autoChosen` | « Choisi automatiquement : réservations ouvertes depuis le {{date}}. » | 自动选择：自 {{date}} 起开放预约。 |
| `planning.scene.viewOrdre` | « Voir l'ordre de passage » | 查看出场顺序 |
| `planning.scene.hideOrdre` | « Masquer l'ordre de passage » | 隐藏出场顺序 |
| `planning.programmes.archived` | « Archivé » | 已归档 |
| `planning.programmes.waiting` | « En attente » | 等待中 |

Le nom du programme reste le texte tapé par Alice (« Noël »), dans les deux
langues, comme le nom de l'onglet. Les dates passent par `fdLongL(iso, langue)`,
comme le reste de la page.

### Programmes masqués (coordination)

Chaque ligne garde son jour J et ses bornes de réservation, et gagne :
le badge « Archivé » ou « En attente », et « Voir l'ordre de passage ».
Afficher / Modifier / Supprimer : inchangés.

## Ce qui sera construit — trois tranches

### B1 — La règle (pur, aucun écran)

`archiveDate`, `programmeState`, `currentProgramme` dans
`src/lib/scene/dimanches.ts`. Rien d'autre ne bouge.

### B2 — L'écran

`SceneClient.tsx` (programme courant calculé, carte du message, volets et
boutons masqués, « Masquer » seulement sur un programme épinglé, liste des
autres programmes avec badges et dépli), `EvenementsTabs.tsx` (même fonction),
création sans épinglage (Q6), locales FR et 中文.

### B3 — Les rappels

`sceneCreneaux` (`api/cron/reminders/route.ts` l. 78-86) lit tous les
programmes et ne garde que `currentProgramme(all, today)` au lieu de
`.where("visible", "==", true)` : la même règle pour l'écran, l'onglet et la
notification du matin. Sans cela, un programme choisi automatiquement
n'enverrait plus aucun rappel d'entraînement.

## Tests (Playwright, `tests/programme-scene.spec.ts`, trois appareils, écrits avant le code)

Horloge simulée comme l'existant : `page.clock.setFixedTime` **avant**
`signInAs` (helper `openNoel`, l. 124-127).

**Règle (fonctions pures, sans navigateur)**

- `programmeState` : avant `debut` → `soon` ; le jour du `debut` et le jour J →
  `open` ; jour J + 1 et jour J + 7 → `passed` ; jour J + 8 → `archived`.
- `archiveDate("2026-12-24")` vaut `"2026-12-31"`.
- `currentProgramme` : un seul programme, avant son `debut` → `null` ; ouvert →
  lui ; passé → lui ; archivé → `null`.
- Bascule : Noël archivé + Pâques ouvert → Pâques.
- Deux programmes ouverts → le jour J le plus proche (Q2).
- Épinglé : `visible: true` gagne même avant son `debut` ; épinglé **et**
  archivé → écarté, la bascule reprend.

**Écran (membre connecté)**

- 25/12 et 31/12 : message « Noël, c'est passé — merci à tous ! » ; ni
  « Réserver un créneau », ni « Ordre de Passage jour J », ni les volets ;
  l'onglet s'appelle toujours « Noël » ; le message annonce Pâques.
- 01/01 : aucun onglet de scène ; la page ne montre aucun programme.
- 04/01 avec Pâques : l'onglet s'appelle « Pâques », ses dimanches sont là, et
  **`db.writes` est vide** (aucune écriture pour basculer).
- 中文 : le message s'affiche en 中文.

**Écran (coordination)**

- Pendant les 7 jours : « Modifier le programme », « Nouveau programme »,
  « Ce programme s'archivera le 31 décembre », « Voir l'ordre de passage »
  déplie la liste en lecture seule (aucun bouton « Ajouter un passage »).
- 01/01 : onglet « Scène », Noël dans « Programmes masqués » avec « Archivé » ;
  son ordre de passage se relit par le dépli.
- Forçage : « Afficher » sur Pâques pendant que Noël est en cours → l'onglet
  devient « Pâques », **un seul** PATCH `visible`.
- Un programme choisi automatiquement n'a pas de bouton « Masquer », mais la
  ligne « Choisi automatiquement ».
- Création : le programme créé part `visible: false` et **aucun autre programme
  n'est modifié** (adapte le test l. 67).

**Non-régression**

- Le volet Entraînements disparaît toujours après le dernier dimanche
  réservable (test l. 137-142, inchangé).
- Chevauchement refusé, marquage rouge, droits sur un créneau : inchangés.

## Hors périmètre (tranché)

Deux onglets de programme en même temps (écarté le 18/09/2026,
`feuille-de-route.md` § 5 — raison D1) ; cron ou tâche planifiée ; suppression
automatique d'un programme ou de ses créneaux ; notification « Noël, c'est
passé » ; archive visible des membres ; recopie de l'ordre de passage d'une
année sur l'autre ou duplication Noël → Pâques ; lien avec les évènements du
lot 6 et leurs dates d'inscription ; changement du modèle de données ou des
règles Firestore.

## Commandes

```bash
npm test -- tests/programme-scene.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la spec attend le go de Timothée.
