# Spec : lot U1 — la scène : la coordination définit la saison de réservation

Lot U1 du chantier « Back-Office, grands écrans, petit déj, setlist »
(`feuille-de-route.md` § 3.U). Suite des lots 3 bis (`spec-programme-scene.md`)
et 12 (`spec-programme-bascule.md`), qui restent vrais sauf ce qui est dit ici.

Statut : **spec écrite le 04/10/2026 ; rien n'est codé.** Attend la validation de
Timothée, puis son go. Part en ligne avec tout le Back-Office, à la fin du
chantier (interrupteur retiré, fusion sur `main`).

## Mots de Timothée

- Réunion de l'équipe, transmise le 03/10/2026 (soir) : « Réservations de la scène
  à mettre en place dans le Back-Office (à préciser). »
- Troisième tour (03/10/2026, nuit) : **option B**, « la coordination définit la
  saison : dates, jours, plages, durée, qui réserve » ; mise en ligne « avec tout
  le Back-Office (pas avant) ».
- Feuille de route § 3.U : « la coordination **définit la saison** (dates
  d'ouverture et de fermeture, jours, plages horaires, durée d'un créneau, qui
  réserve) ; pas de validation de chaque demande ».
- 04/10/2026 : « écrans réunions, réservations de la scène et export avec logo :
  validés ».

## Ce que le code montre (04/10/2026)

- Un programme est `programmes/{id}` : `nom`, `jourJ`, `debut`, `visible`,
  `passages` (`src/types/programme.ts:25-37`) ; un créneau est
  `programmes/{id}/creneaux/{cid}` : `dimanche`, `debut`, `fin`, `quoi`, `qui[]`,
  `note`, auteur (`:40-53`).
- **Seuls les dimanches** se réservent, du premier dimanche ≥ `debut` au dernier
  avant le jour J (`sundaysBetween`, `src/lib/scene/dimanches.ts:17-24`) ; la
  fermeture est calculée (`reservationsClosed`, `:35-37`), sans date réglable.
- Les heures se **tapent à la main**, au quart d'heure, pré-remplies 17:00–18:00
  (`src/app/evenements/scene/CreneauForm.tsx:23,65,83-92` ;
  `Entrainements.tsx:79-81`). Aucune grille, aucune durée.
- **Tout membre connecté** réserve (`firestore.rules:160-166`, création à son
  nom). La liste « Qui » est en dur (`QUI`, `src/types/programme.ts:11-15`) : ni
  « Jeunes » ni « Chorale ».
- Le chevauchement est refusé après relecture (`Entrainements.tsx:52-55`), marqué
  en rouge (`:45`) ; si une course passe, `/api/scene/conflit` prévient les deux
  auteurs. `overlaps()` compare deux plages **du même jour, quel qu'il soit**
  (`dimanches.ts:46-51`).
- Le programme affiché est **calculé** (lot 12) : `programmeState` et
  `currentProgramme` (`dimanches.ts:65-86`), appelés par la page
  (`SceneClient.tsx:66`), l'onglet (`src/components/evenements/EvenementsTabs.tsx:35`)
  et le cron (`src/app/api/cron/reminders/route.ts:83-92`). Un programme créé n'est
  pas épinglé (`SceneClient.tsx:95-97`).
- La coordination gère **dans la même page** que les membres
  (`SceneClient.tsx:141-173` ; `ProgrammeForm.tsx` : nom, jour J, début). Droits :
  `isCoordination` (`src/lib/access.ts:68-73`, `firestore.rules:130-132`),
  `canEditCreneau` (`access.ts:98-104`).
- Rappels : les créneaux du programme courant aux dates J-7, J-3, J-1, fondus dans
  le rappel du matin (`route.ts:174,215-223`) ; la requête
  `.where("dimanche", "in", dates)` (`:89-90`) marche pour **n'importe quelle
  date**. `quiCategory` relie Franco, EDD 中班 / 大班 / 高班 et Gp Paix /
  Fidélité / Bonté à une catégorie de l'app (`src/lib/scene/rappels.ts:12-24`).
- Tout est derrière l'interrupteur `BACK_OFFICE` (`route.ts` de conflit l. 23 ;
  `/evenements/scene` en 404 en ligne, `tests/back-office-coupe.spec.ts:56`).
- `tests/programme-scene.spec.ts` : 43 tests × 3 appareils (dimanches, formulaire
  17:00–18:00, chevauchement, droits, ordre de passage, bascule, archivage).
- Le Back-Office n'existe pas encore (lot U6) : l'écran de la planche
  (`bo-scene-reservations`) range la scène sous Back-Office › Évènements.

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 03/10/2026 | Réservations de la scène dans le Back-Office. La **coordination** (pôle Événement + admins) **définit la saison** : dates d'ouverture et de fermeture, jours, plages horaires, durée d'un créneau, qui réserve. |
| 03/10/2026 | **Pas de validation** de chaque demande : une réservation vaut dès qu'elle est posée. |
| 03/10/2026 | Mise en ligne **avec tout le Back-Office**, pas avant. |
| 04/10/2026 | L'écran « Scène · mettre en place les réservations » de la planche est **validé**. |
| 14–18/09/2026 | Toujours vrai : chevauchement refusé ; un seul programme affiché à la fois ; bascule et archivage automatiques ; ordre de passage tenu à la main ; rappels fondus dans le rappel du matin ; rien sans compte. |

## Décisions proposées ici

| # | Proposition | Raison |
| --- | --- | --- |
| Q1 | La saison est **portée par le programme** (« Noël 2026 ») : des champs en plus sur `programmes/{id}`, pas une collection à part. | L'écran l'intitule « Noël 2026 · réservations », jour J dessous. La bascule du lot 12 et le cron choisissent déjà un programme : la saison suit sans code de plus. |
| Q2 | **Grille de créneaux** : pour chaque jour réservable, les créneaux partent du début de chaque plage, de la durée choisie, tant qu'ils tiennent dans la plage (14:00–19:00 en 1 h → 14:00, 15:00, 16:00, 17:00, 18:00 ; en 1 h 30 → 14:00, 15:30, 17:00). Réserver = prendre **un** créneau ; deux heures en créneaux d'1 h = deux créneaux. | C'est l'aperçu de la planche (« 14:00 Libre · Réserver »). Plus d'heure à taper, donc plus d'erreur « la fin doit être après le début ». |
| Q3 | « **Ouvrir les réservations** » publie la saison. Avant, c'est un **brouillon** que seule la coordination voit, avec l'aperçu ; un brouillon n'est jamais affiché, même épinglé. Après, la règle du lot 12 s'applique (onglet à partir de la date d'ouverture, remerciement sept jours après le jour J, archivage). Un programme d'avant U1 compte comme ouvert. | Le bouton est sur l'écran validé. Sans brouillon, une saison à moitié réglée apparaîtrait aux groupes dès que sa date d'ouverture est passée — le cas de Noël 2026 (ouverture au 1er octobre). |
| Q4 | « **Qui peut réserver** » limite le **« Qui »** d'une réservation : la coordination coche « Tout membre connecté » ou des familles (Groupes, EDD, Jeunes, Louange, Chorale), l'un excluant l'autre ; le formulaire ne propose que les groupes de ces familles ; la coordination n'est pas limitée. Contrôle **en double** : `canReserverPour` (`access.ts`) et la règle des créneaux (`hasOnly`). | L'app ne sait pas qui est « Jeunes » ou « Chorale » : aucun champ du profil. Limiter la personne demanderait un droit nouveau ; limiter le « Qui » marche tout de suite, et Firestore peut le vérifier. |
| Q5 | Familles en dur, à côté de `QUI` : **Groupes** = Gp Bonté, Gp Fidélité, Gp Paix, Gp Amour, Gp Joie ; **EDD** = EDD 小班, 中班, 大班, 高班 ; **Louange** = Franco, 敬拜团 ; **Jeunes** et **Chorale** = deux groupes nouveaux du même nom, sans catégorie (rappel à l'auteur seul, comme 小班). | Les listes sont en dur depuis le 14/09/2026. « Jeunes » et « Chorale » viennent de l'écran : question 2. |
| Q6 | Fermeture par défaut = **dernier dimanche avant le jour J**, modifiable, toujours avant le jour J. Le volet Entraînements disparaît le lendemain de la fermeture. | Garde le comportement testé ; c'est justement la date de l'écran pour Noël 2026 (« au dimanche 20 décembre »). |
| Q7 | Un programme d'avant U1 reçoit **à la lecture** la saison par défaut : dimanche 14:00–19:00, créneaux d'1 h, tout membre connecté, fermeture au dernier dimanche avant le jour J. Rien n'est réécrit tant que la coordination n'enregistre pas. Un programme créé après U1 part en brouillon avec ces mêmes valeurs et l'ouverture au jour de sa création. | Pas de migration ; les réservations existantes restent valables. |
| Q8 | Une réservation qui ne tombe plus dans la grille (saison changée après coup, ou réservation d'avant U1 en 17:00–18:30) **reste** : affichée à son heure, elle rend « Pris » les créneaux qu'elle chevauche ; la coordination la voit signalée « hors grille » et la déplace ou la retire. Jamais de suppression automatique. | Le chevauchement reste la seule règle (`overlaps`) ; rien ne disparaît sans qu'une personne le décide. |
| Q9 | Le champ `dimanche` d'un créneau **garde son nom**, même pour un samedi ; le type le documente (« jour réservé »). | Données, règles, cron, route de conflit et 43 tests l'utilisent : un renommage coûterait une migration pour rien de visible. |
| Q10 | Les membres voient **la liste des jours réservables à venir**, un bloc par jour comme les dimanches d'aujourd'hui, chaque bloc ayant la forme de l'aperçu (heure, « Libre · Réserver » ou « Quoi · Qui » et l'auteur). Jours passés derrière « Voir les jours passés ». Les flèches ‹ › restent à l'aperçu de la coordination. | On garde le parcours actuel : on voit d'un coup où il reste de la place. L'aperçu montre un jour ; la page les montre tous. |
| Q11 | Le formulaire de réservation **ne demande plus d'heure** : il rappelle le jour et le créneau (« Samedi 10 octobre · 10:00–11:00 »), puis Quoi, Qui, Note. **Déplacer** (auteur ou coordination) : « Modifier » propose les créneaux libres de la saison, jour par jour. Un créneau commencé ne se réserve plus. | Le créneau vient de la grille ; « la coordination et les admins peuvent tout déplacer » (écran). |
| Q12 | **Avant le lot U6**, l'écran de la coordination vit dans l'onglet « Scène » de la section Évènements, où est la gestion aujourd'hui ; U6 le range tel quel sous Back-Office › Évènements › Scène (`spec-back-office.md`). | U1 passe en premier ; le Back-Office n'arrive qu'au lot U6. Un seul composant, deux places successives. |
| Q13 | Rien ne change pour la route de conflit et les rappels, sinon qu'**un brouillon n'envoie rien** : `currentProgramme` l'écarte, et le cron l'appelle déjà. Les rappels d'un samedi partent comme ceux d'un dimanche. | La grille ne change pas ce qu'est un créneau : une plage horaire d'un jour. |

## Objectif

1. La coordination règle **une fois** la saison d'un programme (dates, jours,
   plages, durée, qui) et voit tout de suite ce que verront les groupes.
2. Les groupes réservent **un créneau de la grille** en deux gestes, sans taper
   d'heure et sans attendre de validation.
3. Rien de ce qui marche ne se perd : chevauchement refusé, droits, rappels,
   ordre de passage, bascule et archivage du lot 12.

**Réussite** : Alice (pôle Événement) crée « Noël 2026 » (jour J 24/12/2026) et
règle la saison : du 01/10 au 20/12, samedi 10:00–12:00 et dimanche 14:00–19:00,
créneaux d'1 h, réservés aux Groupes, EDD, Jeunes et Louange. L'aperçu du
dimanche 11 octobre montre 14:00, 15:00, 16:00, 17:00, 18:00, tous « Libre ».
Tant qu'elle n'a pas pressé « Ouvrir les réservations », un membre ne voit aucun
onglet. Elle presse : le membre voit l'onglet « Noël 2026 », le samedi 10 et le
dimanche 11 octobre ; il réserve 15:00 « Sketch · Jeunes » ; le formulaire ne lui
propose pas « Chorale » ; le créneau apparaît à son nom chez lui et dans l'aperçu
d'Alice. Un second membre voit 15:00 « Pris », sans bouton. Alice passe la durée à
1 h 30 : la réservation de 15:00 reste, signalée « hors grille » à Alice seule.
Le 21 décembre, le volet Entraînements a disparu.

## Modèle

Champs ajoutés à `programmes/{id}`, tous facultatifs (absents = défauts de Q7) :

| Champ | Type | Sens |
| --- | --- | --- |
| `fin` | `string` (ISO) | dernier jour réservable, avant `jourJ` |
| `plages` | `{ jour: 0–6; debut: "HH:MM"; fin: "HH:MM" }[]` | plages par jour de la semaine (0 = dimanche) ; les jours réservables s'en déduisent |
| `duree` | `30 \| 60 \| 90 \| 120` | durée d'un créneau, en minutes |
| `quiAutorises` | `string[]` | valeurs de `QUI` permises ; vide = tout membre connecté |
| `ouvert` | `boolean` | `false` = brouillon ; absent = ouvert (programme d'avant U1) |

`debut` garde son sens : premier jour réservable, et jour où l'onglet apparaît
(lot 12). Les créneaux ne changent pas de forme.

Fonctions pures, nouveau fichier `src/lib/scene/saison.ts` :

| Fonction | Rôle |
| --- | --- |
| `saisonDe(p)` | la saison complète d'un programme, défauts compris |
| `joursReservables(saison, jourJ)` | les dates ISO entre `debut` et `fin` dont le jour de la semaine a une plage |
| `grilleDuJour(saison, date)` | les créneaux `{ debut, fin }` du jour |
| `lignesDuJour(saison, date, creneaux)` | grille et réservations fusionnées : libre, pris, hors grille |
| `horsGrille(saison, creneaux)` | les réservations hors des jours, des plages ou de la grille |
| `erreursSaison(saison, jourJ)` | « la fermeture doit être avant le jour J », « chaque jour coché a au moins une plage », « plage plus courte qu'un créneau »… |
| `FAMILLES`, `quiPermis(p)` | familles de groupes ; groupes proposés au formulaire |

`reservationsClosed` lit `fin` ; `currentProgramme` écarte les brouillons
(`ouvert === false`) : la page, l'onglet et le cron suivent ensemble.

Règle proposée (`firestore.rules`, sous `match /programmes/{id}`), le reste
inchangé :

```
// U1 (docs/spec-scene-saison.md) : un membre réserve dans une saison ouverte,
// pour des groupes permis par « Qui peut réserver » (liste vide = tout membre
// connecté) ; la coordination n'est pas limitée. Un get() par écriture.
// Miroir : canReserverPour (src/lib/access.ts).
function reservable(programmeId, qui) {
  let p = get(/databases/$(database)/documents/programmes/$(programmeId)).data;
  return p.get('ouvert', true) == true
    && (p.get('quiAutorises', []).size() == 0 || qui.hasOnly(p.quiAutorises));
}

match /creneaux/{cid} {
  allow read: if signedIn();
  allow create: if signedIn() && request.resource.data.auteurUid == request.auth.uid
    && (isCoordination() || reservable(id, request.resource.data.qui));
  allow update: if signedIn() && (isCoordination()
    || (resource.data.auteurUid == request.auth.uid && reservable(id, request.resource.data.qui)));
  allow delete: if signedIn() && (isCoordination() || resource.data.auteurUid == request.auth.uid);
}
```

Miroir client (`src/lib/access.ts`), en double comme le veut le CLAUDE.md :

```ts
/** Réserver pour ces groupes : la coordination toujours ; un membre si la saison
 *  est ouverte et que chaque groupe est permis (liste vide = tous).
 *  Miroir serveur : reservable() sous programmes/{id}/creneaux, firestore.rules. */
export function canReserverPour(
  user: AuthUser | null,
  profile: { poles?: string[] } | null,
  programme: { ouvert?: boolean; quiAutorises?: string[] },
  qui: string[],
): boolean
```

Les bornes de dates et de grille restent vérifiées côté client, comme le reste du
filtrage du site.

## Écrans

Écran de la planche : `bo-scene-reservations` (ordinateur, Back-Office) ;
libellés repris tels quels.

**Coordination** (onglet « Scène » de la section Évènements jusqu'au lot U6, puis
Back-Office › Évènements › Scène) :

- **En-tête** : petit libellé « Scène », titre « {nom} · réservations »,
  « Jour J : jeudi 24 décembre », « Modifier le programme » (nom et jour J). À
  droite : « Programme du jour J » (ouvre l'ordre de passage) et « Ouvrir les
  réservations », bouton plein à la couleur de la scène (`PLANNING_COLORS.scene`).
  Une fois ouvert, le bouton laisse place à « Réservations ouvertes du 1er octobre
  au 20 décembre ».
- **« Mettre en place la saison »** : Ouvertes (du … au …) ; Jours réservables
  (lun. → dim., boutons à bascule) ; Plages horaires (une pastille par plage,
  « sam. 10:00 – 12:00 », qui s'ouvre pour changer ou retirer ; « + Plage ») ;
  Durée d'un créneau (30 min, 1 h, 1 h 30, 2 h) ; Qui peut réserver ; la phrase
  « Deux créneaux qui se chevauchent restent refusés ; la coordination et les
  admins peuvent tout déplacer. » Cocher un jour lui donne une plage (celle du
  jour coché avant) ; décocher retire ses plages. Enregistrement à chaque
  changement, comme l'éditeur de setlist ; une erreur s'affiche sous le champ et
  rien n'est écrit.
- **« Aperçu de ce que verront les groupes »** : un jour, flèches ‹ › vers le jour
  réservable précédent ou suivant, les lignes du jour. Dessous, pour la
  coordination seule : « N réservations hors grille », avec Déplacer et Retirer.
- Le reste de la gestion d'aujourd'hui demeure : Masquer, Nouveau programme,
  Programmes masqués, avec un badge de plus, « Brouillon ». Un brouillon s'ouvre
  depuis sa ligne (« Préparer la saison ») ; un programme qu'on vient de créer
  s'ouvre directement sur sa saison.
- Avant U6, la coordination partage la page des membres : la saison s'y montre en
  entier tant que le programme est un brouillon ; une fois ouvert, elle se replie
  en une ligne (« Saison : 1er octobre → 20 décembre · sam., dim. · 1 h · Groupes,
  EDD, Jeunes, Louange — Modifier la saison ») au-dessus des volets.
- Ordinateur et tablette paysage : deux colonnes (saison à gauche, aperçu à
  droite), comme la planche. Tablette portrait et téléphone : la saison, puis
  l'aperçu dessous ; les pastilles passent à la ligne.

**Membres** (section Évènements, onglet du programme) : volets « Entraînements »
et « Programme {nom} » comme aujourd'hui. Entraînements = un bloc par jour
réservable à venir (« Samedi 10 octobre », le jour en toutes lettres), avec les
lignes de l'aperçu. « Réserver » ouvre le formulaire (Quoi ; Qui, limité aux
groupes permis ; Note). Sur sa réservation, ou sur toutes pour la coordination :
« Modifier » (et déplacer) et « Retirer ». Téléphone et tablette portrait : une
colonne ; tablette paysage et ordinateur : deux colonnes de jours.

Libellés : FR et 中文 pour tout l'écran, comme la scène aujourd'hui ; Timothée
relit le 中文.

## Ce qui sera construit — quatre tranches

### S1 — La règle (pur, aucun écran)
`src/lib/scene/saison.ts` ; type `Plage` et champs facultatifs de `Programme`
(`src/types/programme.ts`) ; `reservationsClosed` sur `fin` ; `currentProgramme`
écarte les brouillons (`src/lib/scene/dimanches.ts`).

### S2 — Droits, en double
`canReserverPour` (`src/lib/access.ts`) et la règle des créneaux
(`firestore.rules`) ; `QUI` gagne « Jeunes » et « Chorale » si la question 2 dit
oui. **À publier par Timothée.**

### S3 — L'écran de la coordination
Carte « Mettre en place la saison », aperçu, « Ouvrir les réservations », liste
hors grille, badge « Brouillon » (`SceneClient.tsx` et un composant
`SaisonForm.tsx`) ; `ProgrammeForm` garde le nom et le jour J (l'ouverture passe
dans la saison) ; écriture champ par champ (`updateProgramme`, déjà en
updateMask).

### S4 — L'écran des membres
`Entrainements.tsx` en grille (blocs par jour, lignes, « Réserver »),
`CreneauForm.tsx` sans heures, « Modifier » pour déplacer ; libellés FR et 中文.

## Tests (Playwright, trois appareils, écrits avant le code)

Nouveau fichier `tests/scene-saison.spec.ts` ; `tests/programme-scene.spec.ts`
adapté.

**Règle (fonctions pures)**
- Grille : 14:00–19:00 en 60 min → 5 créneaux ; en 90 → 14:00, 15:30, 17:00 ;
  plage plus courte qu'un créneau → aucun créneau et une erreur.
- Jours : samedi et dimanche du 01/10 au 20/12/2026 → 24 jours, du samedi
  3 octobre au dimanche 20 décembre ; jamais le jour J.
- Défauts d'un programme d'avant U1 : dimanche 14:00–19:00, 60 min, tous,
  fermeture le 20/12/2026.
- Lignes : une réservation 17:00–18:30 dans une grille d'1 h → 17:00 et 18:00
  « Pris », la réservation à son heure, « hors grille ».
- Erreurs : fermeture le jour J ou après ; jour coché sans plage ; plage dont la
  fin n'est pas après le début.
- `currentProgramme` : brouillon dont l'ouverture est passée → rien, même
  épinglé ; ouvert → lui ; champ absent → ouvert.
- `canReserverPour` : liste vide → tout membre ; groupe d'une famille permise →
  oui ; « Chorale » hors familles → non ; coordination → toujours ; brouillon →
  non pour un membre.

**Coordination**
- Brouillon : un membre n'a pas d'onglet ; la coordination voit la saison et
  l'aperçu ; « Ouvrir les réservations » écrit `ouvert: true` en un seul PATCH ;
  le membre voit alors l'onglet.
- Cocher « sam. » ajoute une plage et le samedi apparaît dans l'aperçu ; changer
  la durée met l'aperçu à jour ; une fermeture après le jour J affiche l'erreur et
  n'écrit rien.
- Hors grille : passer à 1 h 30 avec une réservation à 15:00 → « 1 réservation
  hors grille » ; elle reste en base ; « Déplacer » la pose sur un créneau libre.

**Membres**
- Blocs du samedi et du dimanche, « Libre · Réserver » ; réserver 15:00 écrit
  `debut` 15:00, `fin` 16:00 et l'auteur ; la ligne « Sketch · Jeunes » apparaît
  avec son nom.
- Le formulaire ne propose que les groupes permis ; un créneau pris n'a pas de
  bouton ; un créneau commencé aujourd'hui ne se réserve plus.
- Déplacer : l'auteur choisit un autre créneau libre ; un autre membre ne voit ni
  « Modifier » ni « Retirer ».
- Après la fermeture, le volet Entraînements disparaît (horloge simulée).
- 中文 : jours et libellés traduits.
- Captures regardées à l'œil sur les trois appareils (coordination et membres).

**Non-régression**
- Les tests des dimanches et du formulaire 17:00–18:00 sont réécrits pour la
  grille ; ordre de passage, droits, conflit, rappels, bascule et archivage ne
  bougent pas.
- `tests/back-office-coupe.spec.ts` : `/evenements/scene` reste en 404 sans
  l'interrupteur.

## Hors périmètre

- **Toujours** : un seul programme affiché à la fois ; chevauchement refusé ;
  aucune validation des demandes ; rappels fondus dans le rappel du matin ; rien
  sans compte ; derrière l'interrupteur jusqu'à la mise en ligne de tout le
  Back-Office.
- **Demander avant** : une saison sans jour J (la scène réservée toute l'année) ;
  limiter la personne et non seulement le « Qui » (droit nouveau sur le profil) ;
  une limite de créneaux par groupe ; prendre plusieurs créneaux d'un coup ; une
  liste d'attente. Le glisser d'un créneau dans le calendrier appartient au lot U8
  (`spec-calendrier.md`) et devra respecter la grille.
- **Jamais** : supprimer une réservation automatiquement ; une notification de
  plus ; une couleur nouvelle (`PLANNING_COLORS.scene` existe déjà).

## Questions ouvertes

1. « Ouvrir les réservations » publie la saison, qui reste un brouillon invisible
   des groupes avant (Q3) ? **Recommandation : oui.**
2. « Jeunes » et « Chorale » sont-ils de vrais groupes à ajouter à la liste
   « Qui », et « Louange » = Franco + 敬拜团 (Q5) ? **Recommandation : oui** ;
   sinon ces deux familles quittent l'écran.
3. « Qui peut réserver » limite le « Qui » de la réservation, pas la personne
   (Q4) ? **Recommandation : oui.**
4. Les membres voient tous les jours en liste, un bloc par jour, plutôt qu'un
   jour à la fois avec des flèches (Q10) ? **Recommandation : la liste.**
5. Une réservation = un créneau ; pour deux heures en créneaux d'1 h, on en prend
   deux (Q2) ? **Recommandation : oui.**
6. Jusqu'au lot U6, l'écran de la coordination reste dans l'onglet « Scène » de la
   section Évènements (Q12) ? **Recommandation : oui.**

## Commandes

```bash
npm test -- tests/scene-saison.spec.ts tests/programme-scene.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npm test -- tests/back-office-coupe.spec.ts
npx tsc --noEmit
npm run lint
```

## Avancement

- 04/10/2026 : go (« Lance plusieurs agents si besoin pour coder les autres specs en même temps » ; questions sans
  réponse = recommandations). Branche locale `lot/u1-scene-saison` : `d96082d` S1 (la règle de la saison, pure),
  `290bb31` S2 (droits en double, `canReserverPour` et `reservable()`, règles à publier), `b681429` S3-S4
  commencés (écran de la coordination, grille des membres), **non testé**. Agents arrêtés par Timothée le 04/10 au
  soir ; rien fusionné dans `ui/apple-design`, rien poussé.
- Après le code : publier `firestore.rules` (règle des créneaux) ; à la mise en ligne, la coordination règle la
  saison de Noël 2026 puis l'ouvre. Téléphone des membres : planches `scene-reserver-telephone` et
  `scene-reserver-feuille-telephone` (version 17).
