# Spec : lot U8 — calendrier du Back-Office

Spec écrite le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.

Lot U8 de `feuille-de-route.md` § 3.U. Specs voisines, à raccorder : **U6** (`spec-back-office.md`)
fixe l'adresse `/back-office/calendrier` (sans page d'attente : U8 crée la page et ajoute l'entrée,
dont U6 garde le rang), l'entrée (`estResponsable`),
le cadre des widgets (`backOffice/{uid}`, réglages `sources` et `seulementMoi`) et les réunions
d'équipe (`pour: "equipe:<id>"`) ; **U1** (`spec-scene-saison.md`) cale les créneaux sur une grille
réglée par la coordination (`lignesDuJour`, `canReserverPour`) ; **U3** (`spec-petit-dej.md`) range le
petit déj dans `petitDej/{id}` (`lirePetitDej`, `estLibre`) ; **U4** (`spec-navigation-grand-ecran.md`)
décide la disposition en CSS. **Partage avec U9** (`spec-evenements-2027.md`) : U8 construit le
calendrier, son widget et le lecteur du Sheet des évènements (août → décembre 2026, lecture seule) ;
U9 fixe la bascule du 1er janvier 2027, ce que l'assemblée voit avant, et ce que devient le lecteur.

## Mots de Timothée

> « Toute la partie back-office dans un nouvel onglet/nouvelle partie du site. Avec un dashboard,
> calendrier etc… Pour avoir une vue globale de ce qui se passe et de ce qu'il y a à faire. »
> (03/10/2026)

Sur les évènements (réunion de l'équipe, transmise le 03/10/2026) : jusqu'en décembre, l'app lit le
Sheet et se met à jour quand il change, « scans de la page ».

## Ce que le code montre (04/10/2026)

- **Pas de grille.** La section Évènements n'a qu'un agenda en liste
  (`src/app/evenements/CalendrierClient.tsx` l. 57-94, groupes par mois de
  `src/lib/evenements/agenda.ts` l. 49-58), coupé en ligne (`src/app/evenements/layout.tsx` l. 10).
- **Chaque source a déjà son lecteur REST** : séances du planning avec leur présidence
  (`setlistSeances`, `src/lib/planning/names.ts` l. 331-361, sur `loadPlanningData` l. 29-55) et mes
  services (`findMyServices` l. 247) ; la publication par trimestre n'est filtrée que par les pages
  de grille (`lignesPubliees`, `src/lib/planning/grilles.ts` l. 207), pas par « Mes services » ;
  évènements et réunions (`listEvenements`, `src/lib/firebase/evenements.ts` l. 87-96 ; réunion =
  `pour: "pole:<pôle>"`, `src/types/evenement.ts` l. 12) ; tâches (`listTaches`, une requête de plus
  par tâche pour ses fois, `src/lib/firebase/taches.ts` l. 70-79 ; échéances `echeancesDe`,
  `src/lib/taches/echeances.ts` l. 35 ; « Mes tâches » `aFairePour` l. 128) ; créneaux de scène
  (`listCreneaux`, `src/lib/firebase/programmes.ts` l. 141) ; setlists publiées (`getSetlists` écarte
  brouillons et privées, `src/lib/firebase/setlists.ts` l. 137-155).
- **Les droits de modification existent**, client et règles : évènement et réunion = organisateur +
  coordination (`canEditEvenement`, `src/lib/access.ts` l. 170-177 ; `firestore.rules` l. 187-189),
  donc un membre du pôle ne modifie pas une réunion qu'il n'a pas créée ; tâche = membres du pôle +
  admins (`isPoleMember` l. 55-62 ; règles l. 145-153) ; créneau = auteur + coordination
  (`canEditCreneau` l. 98-104 ; règles l. 160-166).
- **Lire un Sheet public** : `fetchSheet` (`src/lib/planning/sheets.ts` l. 79-92) passe par gviz,
  garde 5 minutes en mémoire (l. 76), ressert la dernière copie si le réseau tombe (l. 87-90) ;
  `useSheet` et `StaleBanner` signalent un planning périmé (`src/lib/planning/useSheet.ts` l. 7-17).
- **Le Sheet des évènements, lu le 04/10/2026**, est public : « Aperçu annuel », puis un onglet par
  mois d'« Août 2026 » à « Septembre 2027 ». Un mois = une grille lundi → dimanche, quatre colonnes
  par jour (Nom, Heure, Lieu, Resp.), semaines de trois lignes (numéros de jour, puis deux lignes
  d'entrées) ; à droite une liste « Aperçu des événements » (Date, Jour, Nom, Heure, Lieu,
  Responsable, Nb inscrits, Clé) ; dessous des blocs « INSCRIPTIONS » (« Nom Prénom »,
  « Téléphone (optionnel) »). Heures en texte libre (« 20h », « 19h-21h »). Sept entrées dans les
  grilles d'octobre à décembre, **trois seulement** dans les listes et l'aperçu (celles qui ont un
  responsable) ; onglets de 2027 vides. **gviz perd les noms** : les numéros de jour dominent la
  colonne « Nom » et gviz en efface le texte (vérifié sur « Octobre 2026 ») ; l'export
  `…/export?format=csv&gid=<onglet>` rend le texte brut et répond au navigateur (CORS ouvert).
- **Rappel du matin** (`src/app/api/cron/reminders/route.ts`) : tâches et ouvertures d'inscriptions
  s'y fondent (l. 177-192, `avecLignes` de `src/lib/evenements/rappel.ts` l. 67), envoyées seules à
  qui n'a rien d'autre (l. 253-289). Le rappel de la veille d'un évènement part **à part**
  (l. 291-318 ; U6 R3 le fond dans le rappel du matin), sous une clé sans date (l. 305) : après un
  déplacement, il ne repart pas si l'ancienne veille est passée.
- **Formulaires et glisser** : `EvenementForm` par `src/app/evenements/nouveau/NouveauClient.tsx`
  (sans date pré-remplie ; `?from=` duplique, l. 26) ; `TacheForm` (`src/components/taches/TacheForm.tsx`
  l. 35-48) ; `@dnd-kit` installé (`package.json` l. 20-22), capteurs sans clavier (`src/lib/dnd/sensors.ts`).
- **Couleurs gelées** : `src/lib/serviceColors.ts` l. 7-33 (scène `#3f51a3`), « Petit déj » `#c87941`
  (l. 56) ; les évènements sont aujourd'hui en indigo scène (`src/app/evenements/EvenementCard.tsx` l. 22).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 03/10/2026 | Un calendrier dans le Back-Office, ouvert à tout responsable, chacun n'y voyant que ses modules (U6). |
| 03/10/2026 | Toutes les sources activables, plus « Seulement moi ». Mois sur ordinateur et tablette, Agenda sur téléphone ; Semaine plus tard. Lecture, création depuis un jour, déplacement en glissant. |
| 03/10/2026 | On glisse les évènements (organisateur, coordination, admins ; case « Prévenir les inscrits »), les tâches, les créneaux de scène, les réunions de pôle ; pas les services, les setlists, le petit déj. Confirmation à chaque fois. |
| 03/10/2026 | Widget Calendrier au tableau de bord : S les prochains jours, M la semaine, L le mois ; sources réglables. |
| 03/10/2026 | Le Sheet « [2026-2027] Calendrier des événements » fait foi jusqu'en décembre 2026 ; à partir de janvier 2027, les évènements se font sur le site, sans import (U9). |
| 04/10/2026 | L'app relit ce Sheet à chaque ouverture, comme le planning. |
| 04/10/2026 | Tablette en paysage : barre latérale toujours réduite. Tout part en ligne ensemble à la fin du chantier. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Sept sources** (tableau du § Modèle). Services, scène et petit déj prennent les couleurs de `serviceColors.ts` ; tâches, évènements et réunions celles de la planche, rangées avec le calendrier. | Aucune valeur gelée ne bouge (`serviceColors.ts` l. 7-33, 56). |
| Q2 | **Qui voit quoi** : la page suit l'entrée du Back-Office (`estResponsable`, U6) ; chaque source garde sa règle (`canSeeEvenement`, `isPoleMember`, `canSeeSetlist`) ; services, Sheet, scène et petit déj pour tout responsable. Une pastille n'apparaît que si la personne a quelque chose à y voir (Tâches : un pôle ; Réunions : un pôle ou une équipe ; admin toujours). | Aucun droit nouveau, donc rien à doubler dans `firestore.rules`. |
| Q3 | **« Seulement moi »** : mes services (`findMyServices`), mes tâches (`aFairePour` : responsable moi, ou mon pôle sans responsable), les réunions de mes pôles et équipes et celles que j'organise, les évènements que j'organise ou où je suis inscrit, les créneaux dont je suis l'auteur ou dont le « qui » est une de mes catégories (`quiCategories`, `src/lib/scene/rappels.ts` l. 26), mes lignes de petit déj (`uid` = moi), les setlists que j'ai créées. Les entrées du Sheet sortent : leurs noms sont du texte libre, reliés à aucun compte. | Ces fonctions servent déjà « Mes services », « Mes tâches » et les rappels. |
| Q4 | **Créer depuis un jour** : les deux boutons de la planche. « Nouvel évènement le JJ/MM » ouvre `/back-office/evenements/nouveau?date=` (U6), formulaire existant, publics de `creatableEvenementPours` (un membre de pôle y crée une réunion) ; « Nouvelle tâche pour le JJ/MM » ouvre `TacheForm` avec l'échéance, choix parmi mes pôles. Un bouton n'apparaît qu'à qui a le droit. Pas de créneau de scène ici : il se réserve dans l'écran de U1. | Les deux formulaires existent ; `NouveauClient` lit déjà un paramètre. |
| Q5 | **Glisser en vue Mois** (ordinateur, tablettes), à la souris comme au doigt (`useDefaultSensors`). Partout, et seul moyen sur téléphone : **« Déplacer… »** dans la fiche de l'entrée (un champ date ; pour un créneau, le choix des créneaux libres de U1), même confirmation. | WCAG 2.5.7 veut une voie sans glisser ; l'agenda du téléphone n'a pas de case où déposer. |
| Q6 | **Ce qui bouge** : la date, jamais l'heure. Un évènement décale du même nombre de jours `date`, `dateFin`, `inscriptionDebut` et `inscriptionFin`. Une tâche unique change d'`echeance` ; **une tâche répétée ne se glisse pas** (« Change la répétition dans la tâche »). **Un créneau se pose sur un créneau libre de la grille du jour visé** (`lignesDuJour`, U1) : la confirmation propose les créneaux libres de ce jour, la même heure d'office si elle est libre ; jour sans plage ou sans place libre = refus ; l'auteur doit passer `canReserverPour`, la coordination non. On ne dépose jamais avant aujourd'hui ; une entrée passée ne bouge pas, sauf une tâche pas terminée. | Une fois porte sa date d'échéance pour nom (`src/types/tache.ts` l. 49-51) : en déplacer une seule demanderait des exceptions. U1 : « Déplacer la pose sur un créneau libre », règle `reservable()`. |
| Q7 | **« Prévenir les inscrits » = une ligne du rappel du lendemain matin**, pas une notification de plus : « Changement : Foot au parc passe au vendredi 9 octobre, 19:00. » / « 活动改期：Foot au parc 改到 10月9日 19:00。». Inscrits avec compte, préférence « Évènements », sauf l'auteur du geste. Pour une réunion : « Prévenir les membres de la réunion » (pôle ou équipe, `destinatairesEvenement`). La confirmation le dit : « Ils le liront dans le rappel de demain matin. » | Une seule notification par personne et par jour ; le patron existe (ouvertures d'inscriptions, `route.ts` l. 185-192, 272-289). |
| Q8 | **Le rappel de la veille suit la nouvelle date** : sous la forme que lui donne U6 (ligne du rappel du matin, R3), sa clé anti-doublon prend la date (`rappel-evenement-<id>-<date>-<uid>`). | Clé sans date aujourd'hui (`route.ts` l. 305). |
| Q9 | **Lire le Sheet** par l'export brut de l'onglet de chaque mois affiché (cinq onglets connus, août → décembre 2026) ; ni gviz, ni l'aperçu annuel, ni les blocs « Inscriptions ». À chaque ouverture, avec le cache de 5 minutes (un rechargement relit toujours) et la dernière copie en cas de panne, comme le planning ; sans copie, un bandeau « Sheet des évènements injoignable » et les autres sources s'affichent. | `sheets.ts` l. 76-91 ; gviz et l'aperçu perdent des entrées (§ précédent). |
| Q10 | **Entrées du Sheet en lecture seule** : ni glisser, ni « Déplacer… » ; leur fiche dit « Lu dans le Sheet des évènements » et ouvre l'onglet du mois. « 20h » s'écrit « 20:00 », « 19h-21h » « 19:00 – 21:00 » ; tout autre texte reste tel quel, sans heure. | Le site écrit les heures « 12:00 » (`spec-evenements-look.md`, 17/09/2026). |
| Q11 | **Pastilles retenues par appareil** (sources allumées, « Seulement moi ») ; d'office tout allumé sauf Setlists. Les sources d'un widget vivent dans ses réglages (`backOffice/{uid}`, `reglages.sources` et `seulementMoi`, U6). | Comme la préférence d'appareil « chart-style » ; rien à ajouter aux règles. |

## Objectif

Voir d'un coup ce qui se passe et ce qu'il y a à faire : filtrer par source et sur soi, ajouter une
tâche ou un évènement sur un jour, déplacer avec confirmation ; un aperçu en trois tailles au tableau de bord.

## Réussite

Horloge au 01/10/2026, Sheet et Firestore simulés. Sur ordinateur, un admin ouvre le calendrier :
octobre en grille, le culte du 4 et sa présidence, une entrée du Sheet le 6 (« 19:00 – 21:00 »), une
réunion le 3, une tâche unique le 15, scène et petit déj le dimanche. « Tâches » éteinte, elles
disparaissent, même après rechargement ; « Seulement moi » ne laisse que les siennes. Le 11 ouvre le
panneau (culte, setlist, cases vides, deux boutons). La tâche glissée du 15 au 14 demande
confirmation : « Déplacer » écrit l'échéance du 14, « Annuler » rien. Le créneau du 4 glissé au 11
propose les créneaux libres du 11 (grille de U1). Un évènement à quatre inscrits glissé : « Prévenir
les inscrits (4) » cochée, `deplacement` écrit, une ligne « Changement : … » au rappel du lendemain
(message testé pur, envoi vérifié en ligne). Entrée du Sheet, service, setlist, petit déj, tâche
répétée ne bougent pas. Sur téléphone, l'agenda part d'aujourd'hui, « Déplacer… » mène à la même
confirmation. Sheet coupé : bandeau, le reste s'affiche. Le widget M montre la semaine et ses points.

## Modèle

| Source (pastille) | Entrées | Couleur | Se déplace |
| --- | --- | --- | --- |
| Services | une par séance (`setlistSeances`) : « Culte · présidence » ; trimestres non publiés compris, comme « Mes services » ; pas la Prépa. Table (absente de la planche) | catégorie (`categoryColor`), pastille pleine | non |
| Évènements (Sheet) | entrées du Sheet et évènements de l'app hors réunions ; une info sans date n'y est pas | planche : fond `#fff3d6`, point `#e0a100` | app oui, Sheet jamais |
| Tâches | chaque échéance (`echeancesDe`) | planche : gris `#f2f2f4`, point `#8e8e93` | tâche unique seulement |
| Réunions | évènements `pole:<pôle>` et `equipe:<id>` (U6) ; la planche dit « Réunions de pôle » sur la page, « Réunions » au widget : « Réunions » partout | planche : `#6b4a8e` sur `#f0ecf9` (question 1) | oui |
| Scène | créneaux du programme affiché (`currentProgramme`, brouillons écartés par U1), pas les places libres | `PLANNING_COLORS.scene` | sur un créneau libre (U1) |
| Petit déj | lignes de `lirePetitDej` (U3) ; « Libre » (`estLibre`) un dimanche à venir sans ligne ; lecture en échec : rien, jamais « Libre » | `serviceColor("Petit déj")`, teinté | non |
| Setlists (éteinte d'office) | setlists publiées que je vois | catégorie | non |

Dans un jour : Services, Évènements, Réunions, Scène, Tâches, Petit déj, Setlists, puis l'heure.
Contrat commun (une seule fonction pure produit la liste ; grille, agenda, panneau et widget la
lisent) :

```ts
type SourceCalendrier = "services" | "evenements" | "taches" | "reunions" | "scene" | "petitDej" | "setlists"

interface EntreeCalendrier {
  source: SourceCalendrier
  cle: string          // `${source}:${id}:${date}` : une tâche répétée a une entrée par échéance
  date: string         // AAAA-MM-JJ ; un évènement sur plusieurs jours a une entrée par jour
  heure: string        // « HH:MM » ou ""
  heureFin: string
  titre: string
  detail: string       // « Présidence : … », « 20:00 · Salle 2 », « DA · échéance »
  couleur: string
  duSheet: boolean     // lecture seule
  moi: boolean         // gardée par « Seulement moi »
  deplacable: boolean  // droits existants (Q2) et règles de Q6
  lien: string         // fiche, page du pôle, setlist, onglet du Sheet
}

// Lecteur du Sheet (pur sur les lignes CSV) : U9 n'ajoute aucun onglet.
const ONGLETS_SHEET = { "2026-08": 1458766095, "2026-09": 981833936, "2026-10": 439766955,
  "2026-11": 1033601810, "2026-12": 484545153 }   // mois → gid de l'onglet
interface EntreeSheet { date: string; titre: string; heure: string; heureFin: string;
  horaire: string; lieu: string; responsable: string }

// evenements/{id} : champ facultatif, écrit au déplacement quand la case est cochée.
deplacement?: { de: string; vers: string; le: string; parUid: string }
```

- **Le lecteur** vérifie le titre de l'onglet (« OCTOBRE 2026 — … »), prend les numéros de jour de
  chaque semaine, lit les deux lignes d'entrées sous chaque jour et s'arrête à « INSCRIPTIONS ».
- **Droits** : `peutDeplacer(user, profile, entree)` (pur) assemble `canEditEvenement`,
  `isPoleMember`, `canEditCreneau` et `canReserverPour` (U1). `access.ts` ne gagne aucun droit,
  `firestore.rules` ne bouge pas pour U8 : rien à publier.
- **Cron** : `deplacementsAPrevenir(evenements, today)` garde les `deplacement.le` des deux derniers
  jours (un matin manqué ne perd rien) ; clé `deplacement-<id>-<vers>-<uid>` ; ligne fondue par
  `avecLignes`, envoyée seule sinon (vers la fiche) ; derrière `BACK_OFFICE` comme les autres lignes.
- **Préférences** : `localStorage` « calendrier » (sources, « Seulement moi »), lu sous `try`.

## Écrans

`/back-office/calendrier`, sous le gabarit de U6 (404 interrupteur coupé, « Réservé aux
responsables »). Grille en pleine largeur (U4 Q10). La vue d'office suit la disposition de U4 (mêmes
requêtes média, lues au montage ; un squelette avant). FR et 中文, comme le Back-Office (U6 Q16).

- **Ordinateur** (`bo-calendrier`). En-tête « Octobre 2026 », ‹ ›, « Aujourd'hui », à droite « Mois |
  Agenda ». Pastilles : Services · Évènements (Sheet) · Tâches · Réunions · Scène · Petit déj ·
  Setlists (✓ allumée, barrée éteinte), puis « Seulement moi ». Grille lun. → dim. sur six semaines,
  hors du mois en gris, aujourd'hui en pastille rouge, jour choisi grisé ; une entrée = icône de sa
  source + libellé tronqué ; trois entrées puis « +N » (ouvre le panneau). Panneau de droite
  (300 px) : « Dimanche 11 octobre », une carte par entrée (source en couleur, titre, détail,
  avertissement orange « Cases vides : Batterie, Basse », calcul du widget de U6), en bas « Nouvel
  évènement le 11/10 » (plein, encre) et « Nouvelle tâche pour le 11/10 ». Une carte ouvre sa fiche ;
  « Déplacer… » sur les entrées déplaçables. Glisser : l'entrée se soulève, la case visée dit
  « Déposer pour déplacer », l'original reste en pointillé. « Agenda » : la liste du téléphone.
- **Tablette paysage** : la même page, barre latérale réduite. **Tablette portrait** : Mois d'office ;
  toucher un jour ouvre le panneau du jour **en feuille** (non dessiné, question 4).
- **Téléphone** (`bo-telephone-calendrier`). « Octobre », « Mois | Agenda » (Agenda d'office).
  Pastilles « Tout » · « Seulement moi » · « Sources » (feuille des sept sources, non dessinée). Liste
  par jour depuis aujourd'hui (« Aujourd'hui · jeudi 1er octobre »), jours vides sautés ; une carte
  par entrée : vignette colorée à icône, titre, détail (« DA · échéance », « 20:00 · Salle 2 »,
  « Présidence : … », « 17:00 – 18:30 », « Libre », « 19:00 · 4 inscrits sur 10 »). Toucher une
  carte ouvre sa feuille (détail, « Ouvrir », « Déplacer… »). En bas, « Afficher novembre ». Mois sur
  téléphone et bouton « + » : non dessinés (questions 3 et 5).
- **Confirmation** (partout) : « Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ? »,
  case « Prévenir les inscrits (4) » cochée d'office s'il y en a (« Prévenir les membres de la
  réunion » pour une réunion), tâches liées nommées (« ne bougent pas »), pour un créneau les
  créneaux libres du jour visé (la même heure cochée si elle est libre), « Annuler » · « Déplacer ».
  Refus en une phrase : « Aucun créneau libre ce jour-là », « La scène n'est pas ouverte ce
  jour-là », « Pas avant aujourd'hui ».
- **Widget Calendrier** (`bo-tableau-de-bord`, cadre de U6). En-tête « Calendrier », à droite
  « Prochains jours » (S), « Cette semaine » (M) ou le mois (L). S : trois jours à venir au plus
  (sur quatorze), une ligne par jour (« Sam. 3 · Réunion DA · 20:00 »). M : les sept jours de la
  semaine, un point coloré par entrée (quatre au plus), puis les lignes des jours qui restent.
  L : grille du mois à points, légende. Réglages : Services, Évènements, Tâches, Réunions, Scène,
  Petit déj, Seulement moi. Toucher un jour ouvre la page sur ce jour.

## Ce qui sera construit

Chaque tranche : tests d'abord, vus rouges puis verts sur les trois appareils, `npx tsc --noEmit`,
`npm run lint`.

| # | Tranche | Vérification |
| --- | --- | --- |
| C1 | Lecteur du Sheet : `ONGLETS_SHEET`, lecture par export, `lireMoisSheet`, `heureDuSheet`, cache, panne | fixture anonymisée : entrées et heures justes, aucun téléphone lu, bandeau si panne |
| C2 | Sources (pur) : `entreesCalendrier(debut, fin, …)`, « Seulement moi », ordre, `peutDeplacer` | tests purs, une ligne par source et par droit |
| C3 | Page en Mois (ordinateur, tablettes) : la page et l'entrée « Calendrier » du menu (U6 Q17) ; pastilles retenues, grille, « +N », panneau ou feuille, fiche du Sheet en lecture seule | rendu sur ordinateur et tablettes, captures regardées |
| C4 | Agenda (téléphone, et au choix en grand), feuille « Sources », Mois à points sur téléphone | rendu sur les trois appareils |
| C5 | Créer depuis un jour : boutons, `?date=` dans `NouveauClient`, `TacheForm` pré-rempli | formulaires ouverts avec la date, boutons absents sans droit |
| C6 | Déplacer : glisser (Mois), « Déplacer… », confirmation, écritures, refus (Q6, U1) | écritures attendues, rien sans confirmation, refus nommés |
| C7 | Prévenir : champ `deplacement`, ligne du matin FR et 中文, clé datée du rappel de la veille | fonctions pures du message et du choix des destinataires |
| C8 | Widget Calendrier S, M, L dans le cadre de U6 ; entrées du Sheet dans « Prochains évènements » (widget 3 de U6 : « ceux du Sheet avec U8 ») | trois tailles, réglage des sources, lien vers la page ; Sheet dans le widget 3 |

## Tests

Playwright, trois appareils, écrits avant le code ; Firestore simulé (`tests/helpers/fakeSession.ts`),
Sheet simulé (`page.route(/docs\.google\.com\/spreadsheets/, …)`), horloge simulée (`page.clock`).

- `tests/calendrier-sheet.spec.ts` (C1), sur `tests/fixtures/sheet-evenements-mois.csv` (structure
  d'un vrai onglet, titres et noms inventés, un téléphone dans un bloc) : dates et heures (« 20h »,
  « 19h-21h », texte libre) ; le téléphone n'apparaît jamais ; mauvais titre d'onglet = aucune
  entrée ; l'adresse appelée est l'export par gid, jamais gviz ; deux ouvertures à moins de
  5 minutes = une requête, au-delà = deux ; réseau coupé = bandeau et autres sources affichées.
- `tests/calendrier.spec.ts` (C2 à C5 ; ajouté au `testMatch` du projet `tablette-paysage` de U4) :
  Mois d'office sur ordinateur et tablettes, Agenda sur téléphone ; une pastille éteinte retire sa
  source, même après rechargement ; « Seulement moi » ; panneau (ordinateur) et feuille (tablette
  portrait) du jour ; « +N » ; une entrée du Sheet n'a ni poignée ni « Déplacer… » et ouvre l'onglet
  du mois ; ni pastille Tâches ni « Nouvelle tâche » sans pôle ; création à la date du jour choisi ; 中文.
- `tests/calendrier-deplacer.spec.ts` (C6, C7) : glisser une tâche unique (ordinateur, tablette),
  confirmer = PATCH de l'échéance, annuler = rien ; rien ne se soulève pour une tâche répétée, une
  entrée du Sheet, un service, une setlist, le petit déj, un évènement passé ; pas de dépôt avant
  aujourd'hui ; l'organisateur glisse un évènement : case cochée avec le nombre, dates et bornes
  d'inscription décalées, `deplacement` écrit ; un membre qui n'organise pas ne le soulève pas ;
  réunion : « Prévenir les membres de la réunion » ; créneau : la confirmation propose les créneaux
  libres du jour visé (grille de U1), refus sans place libre, jour fermé ou groupe non permis ;
  « Déplacer… » au clavier ; téléphone : « Déplacer… » (test propre au téléphone, il le dit dans
  son titre). Purs : ligne FR et 中文, fenêtre de deux jours, clés, clé datée de la veille.
- `tests/calendrier-widget.spec.ts` (C8) : S, M, L à partir des mêmes entrées ; une source éteinte
  dans les réglages disparaît du widget ; toucher un jour ouvre la page sur ce jour ; le widget 3
  de U6 montre les entrées du Sheet.
- `tests/back-office-coupe.spec.ts` : la page du calendrier répond 404 interrupteur coupé.

## Hors périmètre

- **Toujours** : derrière `BACK_OFFICE` tant qu'il existe ; droits existants seulement ; confirmation
  à chaque déplacement ; la grille de U1 pour un créneau ; heures « 12:00 » ; Firestore en REST ;
  trois appareils ; FR et 中文 (U6 Q16).
- **Demander avant** : la vue Semaine ; glisser dans l'agenda ; déplacer une seule fois d'une tâche
  répétée ; décaler les tâches liées avec leur évènement ; lire « Nb inscrits » du Sheet ; réserver
  un créneau de scène depuis le calendrier ; export .ics ; une dépendance npm (aucune n'est prévue) ;
  une couleur de plus.
- **Jamais** : écrire dans le Sheet ; lire les blocs « Inscriptions » (noms, téléphones) ; lire ce
  Sheet par gviz ; une notification de plus pour un déplacement ; toucher `serviceColors.ts` ;
  déplacer un service, une setlist, un petit déj ou une entrée du Sheet.

## Questions ouvertes

1. La planche peint les réunions en violet `#6b4a8e`, la couleur gelée du Groupe Paix. On garde ?
   Recommandation : oui ; la réunion est teintée, le service du Groupe Paix plein (« une forme, une
   information »).
2. Le jaune des évènements (`#e0a100`, fond `#fff3d6`) est une couleur nouvelle, rangée avec le
   calendrier et non dans `serviceColors.ts`, alors que la section Évènements les peint en indigo
   scène. D'accord ? Recommandation : oui, c'est la planche.
3. Le sélecteur « Mois | Agenda » est sur la planche du téléphone, l'écran Mois du téléphone non. Mois
   sur téléphone = la grille à points du widget L, la liste du jour touché dessous ? Recommandation :
   oui.
4. Deux écrans non dessinés : sur tablette portrait, le panneau du jour en feuille ; au-delà de
   trois entrées dans une case, « +N » ouvre ce panneau. D'accord ? Recommandation : oui.
5. Créer sur téléphone (non dessiné) : un « + » à côté de « Mois | Agenda » propose « Nouvel
   évènement » et « Nouvelle tâche » pour le jour affiché ? Recommandation : oui.
6. Le dimanche, une seule entrée « EDD » (les trois classes dans sa fiche) plutôt que trois ?
   Recommandation : oui, sinon « +N » chaque dimanche.
7. Un évènement déplacé laisse ses tâches liées (lot 14) à leur date, la confirmation les nomme ?
   Recommandation : oui pour ce lot.
8. La planche montre « Nouvel évènement le 11/10 » en 2026, quand le Sheet fait foi : le bouton reste,
   le formulaire renvoie au Sheet un évènement « Toute l'église » de 2026 (U9) ? Recommandation : oui.
9. Une réunion se déplace par son organisateur et la coordination seulement (règle d'aujourd'hui,
   que U6 garde), pas par tous ses membres ? Recommandation : oui, aucune règle à publier.

## Commandes

```bash
npm test -- tests/calendrier-sheet.spec.ts tests/calendrier.spec.ts tests/calendrier-deplacer.spec.ts tests/calendrier-widget.spec.ts
npm test -- tests/back-office-coupe.spec.ts   # second serveur, interrupteur coupé
npx tsc --noEmit && npm run lint               # PW_PORT=3000 si un next dev tourne déjà
```

## Avancement

Spec validée et go de code donné (04/10/2026, redit le 05/10/2026) ; questions ouvertes = recommandations.

- **05/10/2026 — C1 faite** (branche `lot/u8-calendrier`, commit « feat(U8): C1 — lecteur du Sheet
  des évènements ») : `src/lib/evenements/sheet.ts` (`SHEET_EVENEMENTS_ID`, `ONGLETS_SHEET`,
  `lireCSV`, `heureDuSheet`, `lireMoisSheet`, `chargerMoisSheet`, `lireSheetEvenements`) ;
  `tests/calendrier-sheet.spec.ts` (15 tests purs × 3 appareils, vus rouges sur une ébauche puis
  verts) sur `tests/fixtures/sheet-evenements-mois.csv` (structure d'octobre, titres et noms
  inventés). Export par gid, jamais gviz ; titre d'onglet vérifié (accents ignorés) ; lignes de
  semaine reconnues à leurs seuls numéros de jour (six semaines en août) ; deux lignes d'entrées sous
  chacune ; arrêt avant « INSCRIPTIONS » ; colonnes 1 à 28 seulement (l'aperçu n'est jamais lu).
  Heures : « 20h », « 12h30 », « 18:45 », plages à tiret (« 19h-21h », « 19h30 - 20h15 »,
  « 19H–22H ») ; tout autre texte sans heure, gardé dans `horaire`. Cache de 5 minutes en mémoire
  (vidé au rechargement), dernière copie resservie en panne sans bandeau ; sans copie (réseau coupé
  ou réponse en erreur) `injoignable: true` ; un onglet en panne n'efface pas les autres mois ; un
  mois sans onglet n'appelle rien. Contrôle sur le vrai Sheet (05/10/2026, dates et heures seules
  affichées) : les six entrées de novembre et décembre lues, heures justes.
- **Reste de C1 pour C3** : le bandeau « Sheet des évènements injoignable » et « les autres sources
  s'affichent » se vérifient sur la page (`injoignable` de `lireSheetEvenements`), avec
  `page.route(/docs\.google\.com\/spreadsheets/, …)` qui coupe le Sheet.
- **05/10/2026 — C2 faite** (même branche, après la fusion de `lot/u1-scene-saison` ; commit
  « feat(U8): C2 — sources du calendrier ») : `src/lib/calendrier/entrees.ts`, pur. Il expose
  `SOURCES` (ordre dans un jour), `SOURCES_D_OFFICE` (tout sauf Setlists), `COULEURS_CALENDRIER`
  (point et fond de la planche pour évènements, tâches, réunions), `entreesCalendrier(debut, fin,
  donnees, contexte)` (contexte = `user`, `profile`, `lang` fr / 中文, `today`), `filtrerEntrees`
  (pastilles, « Seulement moi »), `sourcesPermises` (Q2 : Tâches avec un pôle, Réunions avec un pôle
  ou une équipe, admin toutes) et `peutDeplacer(user, profile, cible, today)`. Les données arrivent
  déjà lues (`DonneesCalendrier` : séances, mes services, Sheet, évènements, mes inscriptions,
  tâches et leurs fois, programme affiché et créneaux, lignes du petit déj ou `null`, setlists) :
  le chargement est pour C3. `tests/calendrier.spec.ts` : 34 tests purs × 3 appareils, vus rouges
  sur une ébauche puis verts (avec ceux de C1 : 147 verts).
- **Choix de C2, faute de réponse dans la spec** : EDD fondu en une entrée par dimanche (question 6),
  détail « 中班 Lou M. · 大班 · 高班 Sam T. » ; Campus matin et soir à part. Un évènement sur plusieurs
  jours porte son heure le premier jour seulement. Le détail d'une entrée du Sheet ajoute le
  responsable (« 19:00 – 21:00 · Salle 2 · Lou »), texte du Sheet affiché sans être relié à un compte.
  Une tâche terminée n'est pas « à moi » (comme `aFairePour`) et ne se soulève pas (sa fois porte sa
  date pour nom) ; une tâche passée pas terminée se soulève. Un évènement commencé (sur plusieurs
  jours) ne bouge plus. Réunions d'équipe : `pour: "equipe:<id>"` lu dès maintenant, vues de qui a
  l'équipe dans `profile.dansEquipes` (U6 R4), en plus de `canSeeEvenement`. Liens : `/evenements/<id>`,
  `/taches/<pôle>`, `/setlists/<id>`, `/evenements/scene`, `/planning/<page>`, `/planning/table`,
  onglet du Sheet `…/edit#gid=<gid>`. Le petit déj est lu sur la forme de `LignePetitDej` (U3),
  `estLibre` refait en une ligne (U3 n'est pas fusionné ici).
- **05/10/2026 — C3 faite** (même branche, après la fusion de `lot/u6-back-office` ; commit
  « feat(U8): C3 — page en Mois et entrée Calendrier ») : `/back-office/calendrier`
  (`src/app/back-office/calendrier/`, sous le gabarit de U6) ; l'entrée « Calendrier » du menu
  (retirée de `ENTREES_A_VENIR` dans `access.ts` ; le widget Calendrier y reste jusqu'à C8) ;
  `src/lib/calendrier/charger.ts` (lecteurs REST branchés sur `DonneesCalendrier`, une source en
  panne n'empêche pas les autres), `grille.ts` (six semaines, mois voisin, libellé court, titres FR
  et 中文), `preferences.ts` (`localStorage` « calendrier » sous `try`) ;
  `src/components/calendrier/` (`GrilleMois`, `PanneauJour`, `apparence`). Pastilles retenues,
  « Seulement moi », trois entrées puis « +N », panneau de 300 px à droite sur ordinateur et
  tablette couchée (requêtes média de U4), feuille ailleurs ; fiche du Sheet en lecture seule
  (« Lu dans le Sheet des évènements », onglet du mois dans un nouvel onglet) ; bandeau « Sheet des
  évènements injoignable », le reste s'affiche. `tests/calendrier.spec.ts` (ajouté à
  `SPECS_GRAND_ECRAN`) : 15 tests de page + 2 purs, vus rouges (entrée absente du menu) puis verts
  sur les cinq projets ; `back-office-espace.spec.ts` mis à jour (Calendrier dans le menu,
  Statistiques seule encore en 404) ; `back-office-coupe.spec.ts` : la page répond 404
  interrupteur coupé. Captures regardées aux cinq tailles, conformes à la planche `bo-calendrier`.
- **Choix de C3, faute de réponse dans la spec** : la carte d'un service se nomme par sa catégorie
  (« Culte Franco »), sa présidence en titre (planche) ; le petit déj par « Petit déj », le nom ou
  « Libre » en titre. Le petit déj est lu par une requête REST locale (`lirePetitDej` dans
  `charger.ts`) tant que U3 n'est pas fusionné. Sur grand écran, le panneau montre aujourd'hui dès
  l'ouverture. Le téléphone montre encore la grille (l'Agenda d'office vient avec C4) ; le sélecteur
  « Mois | Agenda » vient avec C4.
- **Reste après C3** : l'avertissement orange « Cases vides : … » d'un service dans le panneau
  attend le calcul `casesVides` du widget 4 de U6 (sur `lignesDeLAnnee` de U2), absent de cette
  branche ; à brancher quand U2 et le widget de U6 seront fusionnés. « Déplacer… » (C6) et les deux
  boutons de création (C5) se posent dans `PanneauJour.tsx`.
- **05/10/2026 — C4 faite** (même branche, commit « feat(U8): C4 — Agenda, feuille Sources, Mois à
  points ») : « Mois | Agenda » à droite de l'en-tête partout ; vue d'office selon l'appareil
  (Agenda sous 768 px, Mois ailleurs, tablette debout comprise), non retenue. **Agenda**
  (`src/components/calendrier/Agenda.tsx`) : d'aujourd'hui à la fin du mois, jours vides sautés,
  « Aujourd'hui · jeudi 1er octobre », une carte par entrée (vignette colorée à icône, titre,
  détail), « Afficher novembre » ajoute un mois ; toucher une carte ouvre sa feuille (source, titre,
  date, détail, « Lu dans le Sheet… », « Ouvrir » ; l'onglet du Sheet dans un nouvel onglet). Pas de
  ‹ › ni de panneau du jour en Agenda. **Téléphone** : titre sans l'année de l'année en cours
  (« Octobre », « 10月 ») ; « Tout » · « Seulement moi » · « Sources » (feuille des sources permises,
  mêmes pastilles retenues) ; **Mois à points** (`GrillePoints.tsx`, question 3 : quatre points au
  plus, aujourd'hui en rouge, jour choisi en encre, légende des sources du mois), ‹ › et
  « Aujourd'hui » au-dessus de la grille, la liste du jour touché dessous (mêmes cartes), sans
  feuille. `tests/calendrier.spec.ts` : 12 tests C4 (vus rouges, puis verts sur les cinq projets ;
  ceux du téléphone le disent dans leur titre) ; les tests C3 de la grille étiquetée sont limités à
  l'ordinateur et aux tablettes (le téléphone a l'agenda), les autres passent par la feuille
  « Sources » sur téléphone. Captures regardées aux cinq tailles, l'agenda conforme à la planche
  `bo-telephone-calendrier`.
- **Choix de C4, faute de réponse dans la spec** : « Tout » = « Seulement moi » éteint (il ne
  rallume pas les sources) ; l'Agenda part toujours d'aujourd'hui, même après ‹ › en Mois ; la vue
  choisie n'est pas retenue au rechargement (seules les pastilles le sont, Q11) ; le Mois à points du
  téléphone reprend la grille du widget L, que C8 pourra réutiliser.
- **05/10/2026 — C5 faite** (même branche, après la fusion de `lot/u6-back-office` avec B3 ; commit
  « feat(U8): C5 — créer depuis un jour ») : en bas du panneau du jour (et de sa feuille sur tablette
  debout), « Nouvel évènement le 11/10 » (plein, encre) et « Nouvelle tâche pour le 11/10 »
  (`BoutonsCreation`, `src/components/calendrier/PanneauJour.tsx` ; `jourCourt` dans `grille.ts`).
  Le premier est un lien vers `/back-office/evenements/nouveau?date=AAAA-MM-JJ` : `NouveauClient`
  pré-remplit la date (une date mal formée est ignorée), publics de `creatableEvenementPours`. Le
  second ouvre `TacheForm` sur place, avec la nouvelle prop `echeance`, choix parmi mes pôles (tous
  pour un admin) ; enregistrée, la tâche est écrite (`createTache`), le responsable nommé par un autre
  est prévenu comme sur la page du pôle, et le calendrier relit ses sources. Chaque bouton seulement
  pour qui a le droit (évènement : un public ouvert ; tâche : un pôle). **Question 5** : sur
  téléphone, et en Agenda sur grand écran (pas de panneau), un « + » (« Créer ») à droite de « Mois |
  Agenda » ouvre la feuille « Créer » avec les deux boutons pour le jour affiché (le jour touché du
  Mois à points ; aujourd'hui en Agenda). `tests/calendrier.spec.ts` : 7 tests C5 + captures, vus
  rouges puis verts sur les cinq projets (325 verts, 20 sautés pour tout le fichier) ; le test
  « +N » compte désormais les cartes de la liste (les boutons sont des liens de plus). Captures
  regardées : ordinateur 1440 conforme à la planche `bo-calendrier` (boutons en bas du panneau),
  feuille du jour sur tablette debout, feuille « Créer » sur téléphone, formulaire de tâche pré-rempli.
- **Choix de C5, faute de réponse dans la spec** : les boutons sont proposés pour tout jour, passé
  compris (la spec ne borne que le déplacement) ; le « + » sert aussi l'Agenda sur grand écran ;
  libellés 中文 `新建{{date}}的活动`, `新建{{date}}截止的任务`, `新建`, date « 10月11日 ». La
  question 8 (en 2026, renvoyer au Sheet un évènement « Toute l'église ») est laissée à U9 : le
  formulaire s'ouvre tel quel.
- **05/10/2026 — C6 faite** (même branche, commit « feat(U8): C6 — déplacer ») :
  `src/lib/calendrier/deplacer.ts` (pur : `ecartJours`, `decaler`, `champsDecales`,
  `planDeplacement`, `questionDeplacement`) ; `src/components/calendrier/Deplacer.tsx` (la
  confirmation) ; glisser dans `GrilleMois.tsx` (`@dnd-kit/core` déjà installé, `useDefaultSensors`,
  case visée sous le pointeur, « Déposer pour déplacer », original en pointillé, entrée soulevée
  penchée et cernée d'encre comme la planche) ; « Déplacer… » sous une carte déplaçable du panneau
  du jour (`PanneauJour.tsx`) et dans la feuille d'une entrée (`Agenda.tsx`, seul moyen sur
  téléphone). Confirmation : « Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ? »
  (中文 « 把「…」从10月15日（周四）改到10月14日（周三）？ ») ; « Déplacer… » demande d'abord la date
  (champ, aujourd'hui au plus tôt). Écritures : tâche unique = `echeance` seule
  (`deplacerTache`, `src/lib/firebase/taches.ts`) ; évènement et réunion = `date`, `dateFin`,
  `inscriptionDebut`, `inscriptionFin` décalés de l'écart, jamais l'heure, et `deplacement`
  (`{ de, vers, le, parUid }`, type `Deplacement` dans `src/types/evenement.ts`) ; créneau =
  `dimanche`, `debut`, `fin` du créneau libre choisi (`creneauxLibres` de U1, la même heure cochée
  si elle est libre). Refus en une phrase : « Pas avant aujourd'hui », « La scène n'est pas ouverte
  ce jour-là » (jour sans plage, hors saison, jour J), « Aucun créneau libre ce jour-là ». Après
  l'écriture, le calendrier relit ses sources. `tests/calendrier-deplacer.spec.ts` (ajouté à
  `SPECS_GRAND_ECRAN`) : 10 tests purs + 14 de page et 2 de captures, vus rouges sur une ébauche
  puis verts sur les cinq projets ; avec `tests/calendrier.spec.ts`, 434 verts et 41 sautés (tests propres à un appareil).
- **Choix de C6, faute de réponse dans la spec** : case décochée (ou sans case : pas d'inscrit,
  inscription externe) = `deplacement: null`, pour qu'un déplacement précédent ne soit pas annoncé à
  la place de celui-ci par le rappel de C7 ; `deplacement.de` et `.vers` = dates de début de
  l'évènement (glissé depuis un autre jour d'un évènement sur plusieurs jours, il se décale de
  l'écart). La case « Prévenir les inscrits (4) » compte `inscrits` (invités compris), cochée
  d'office ; « Prévenir les membres de la réunion » aussi. Une tâche unique « En cours » emporte sa
  fois (nommée par sa date) sous la nouvelle date, sinon son état se perdrait. Un créneau d'aujourd'hui
  déjà commencé n'est pas proposé (`creneauxLibres`). Le glisser ne fait défiler la page que tout au
  bord (5 % de la hauteur), sinon la dernière semaine fuyait sous le doigt ; les annonces anglaises
  de dnd-kit sont tues (le clavier passe par « Déplacer… », la confirmation dit tout). Les entrées
  derrière « +N » ne se glissent pas : « Déplacer… » dans le panneau du jour. Dépôt sur le même jour
  = rien. La confirmation est une boîte centrée sur les trois appareils.
- **05/10/2026 — C7 faite** (même branche, commit « feat(U8): C7 — prévenir ») :
  `src/lib/calendrier/prevenir.ts` (pur : `ligneDeplacement`, `deplacementsAPrevenir`,
  `cleDeplacement`, `cleVeille`, `destinatairesDeplacement`). Ligne du matin « Changement : Foot au
  parc passe au vendredi 9 octobre, 19:00. » / « 活动改期：Foot au parc 改到 10月9日 19:00。» (sans
  heure : « … passe au vendredi 9 octobre. » / « … 改到 10月9日。»), nouvelle sorte `deplacement` des
  lignes d'évènements (`src/lib/reunions/rappels.ts`) : fondue dans la première notification du jour
  (services, tâches), seule sinon, titre « Changement de date » / « 活动改期 », ouverte sur la fiche.
  Cron (`src/app/api/cron/reminders/route.ts`, dans `lignesEvenements`, donc derrière `BACK_OFFICE`) :
  évènements dont `deplacement.le` date d'hier ou d'avant-hier (jour UTC du cron), destinataires =
  inscrits avec compte, ou membres pour une réunion (`destinatairesEvenement`), sans l'auteur du
  geste, préférence « Évènements », clé `deplacement-<id>-<vers>-<uid>`. Rappel de la veille : clé
  datée `rappel-evenement-<id>-<date>-<uid>` (Q8). `fromFsEvenement` relit `deplacement`.
  `tests/calendrier-deplacer.spec.ts` : 7 tests purs « prévenir (pur) » (ligne FR et 中文, fenêtre de
  deux jours, clés, clé datée de la veille, destinataires, rappel du matin, branchement du cron), vus
  rouges sur une ébauche (sauf celui du branchement, écrit après) puis verts sur les cinq projets.
- **Choix de C7, faute de réponse dans la spec** : un déplacement fait ce matin (avant le cron)
  attend le lendemain ; un `deplacement` dont `vers` n'est plus la date de l'évènement (redéplacé
  depuis par le formulaire) ou un évènement passé ne s'annonce pas, pour ne jamais dire une date
  fausse ; un évènement déplacé à aujourd'hui s'annonce encore. Notification faite de seuls
  déplacements : titre « Changement de date » / « 活动改期 ». Le premier matin après le déploiement,
  la clé datée de la veille ne refait pas partir un rappel déjà envoyé (la veille d'un évènement
  n'existe qu'un jour) ; seul un évènement déplacé vers demain, déjà rappelé sous l'ancienne date,
  est rappelé de nouveau, comme voulu.
- **05/10/2026 — fusion de `lot/u6b-tableau-de-bord`** (B4 à B6 : tableau de bord, Personnaliser,
  barre du bas) dans `lot/u8-calendrier`, avant C8. Conflits : l'Avancement de `spec-back-office.md`
  (les deux sections gardées), `SPECS_GRAND_ECRAN` (calendrier + tableau de bord), les libellés
  `backOffice.*` (réunis, sans `enAttente`, `scene` ni `administration`, retirés par B3) et
  `back-office-espace.spec.ts`. L'entrée Calendrier étant là depuis C3, les tests de la barre du bas
  (`barre-back-office.spec.ts`) écrits avant elle attendent désormais la barre de la planche
  (Accueil · Calendrier · Tâches · Planning · Plus) ; une pièce de plus dans « Plus » et la feuille.
- **05/10/2026 — C8 faite** (même branche, commit « feat(U8): C8 — widget Calendrier S, M, L ; le
  Sheet dans Prochains évènements ») : le widget 11 (`src/components/backOffice/widgets/WidgetCalendrier.tsx`,
  règles pures `src/lib/calendrier/widget.ts`), retiré de `WIDGETS_A_VENIR` (`access.ts`) : permis à
  tout responsable, d'office au tableau de bord d'un admin (taille M, Q11 de U6). Mêmes entrées que
  la page (`chargerCalendrier`, `entreesCalendrier`, Sheet sur la période du widget, bandeau discret
  s'il est injoignable). **S** « Prochains jours » : trois jours au plus sur quatorze, une ligne par
  jour (« Sam. 3 · Réunion DA · 20:00 » : titres à la suite, heure de la première entrée qui en a
  une). **M** « Cette semaine » : lundi → dimanche, un point par entrée (quatre au plus), aujourd'hui
  en encre (planche), puis les lignes des jours qui restent. **L** le mois (« Octobre ») : la grille
  à points du téléphone (`GrillePoints`) et sa légende. Réglages (`groupesDeReglages`) : un groupe
  « Sources » — les sources que la personne peut voir, sans Setlists, puis « Seulement moi » (oui /
  non rangé avec elles, comme la planche ; `choisirReglage` le traite à part, la dernière source ne
  s'éteint pas). Toucher un jour (ligne, case de M ou de L) ouvre `/back-office/calendrier?jour=…` :
  la page s'ouvre en Mois sur ce mois et ce jour — panneau à droite, feuille du jour sur tablette
  debout (ouverte une fois les requêtes média lues, jamais sur ordinateur), liste sous le Mois à
  points sur téléphone ; la page passe sous `Suspense` (`useSearchParams`). **Widget 3** :
  `avecLeSheet` (`donnees.ts`) mêle aux évènements de l'app les entrées du Sheet à venir (lues sur
  un an : seuls les onglets connus sont demandés, donc rien après décembre 2026, U9), par date puis
  heure, 3 / 5 / 10 ; une section choisie les écarte (toute l'église). Ligne : « dim. 04/10 · 12:30
  · Sheet », lien vers l'onglet du mois dans un nouvel onglet (`lienOngletSheet`, `sheet.ts`, repris
  par la fiche du calendrier ; `Rangee` gagne `externe`). `tests/calendrier-widget.spec.ts` (ajouté à
  `SPECS_GRAND_ECRAN`) : 11 tests purs + 13 d'écran + 1 de captures, vus rouges (ébauches vides,
  widget absent) puis verts sur les cinq projets (121 verts, 4 sautés : le test propre au
  téléphone). Tests de U6 mis à jour (widget Calendrier permis, défaut de l'admin, catalogue
  d'Alice). Verts ensemble : `back-office-espace`, `barre-back-office`, `tableau-de-bord`,
  `calendrier`, `calendrier-sheet`, `calendrier-widget` (888) puis `calendrier`,
  `calendrier-widget`, `back-office-coupe` (630). Captures `test-results/calendrier-widget-captures/`
  regardées aux cinq tailles (S, M, L), conformes à `bo-tableau-de-bord` et `bo-telephone-accueil`.
- **Choix de C8, faute de réponse dans la spec** : le contenu suit la taille sur tous les appareils
  (le téléphone de la planche montre la liste S sous « Cette semaine » : on suit la spec, M y montre
  la semaine à points) ; « Aujourd'hui » / « 今天 » nomme le jour courant dans les lignes ; en L,
  aujourd'hui en rouge comme sur le Mois à points du téléphone (même composant) ; dans une ligne, un
  créneau se dit « Scène », un petit déj libre « Petit déj : libre » ; le widget attend le profil
  avant de lire (« mes services » et les pôles en dépendent) ; Sheet injoignable : une phrase sous
  le widget. Widget 3 : une entrée du Sheet dit « Sheet » / « 活动表 » à la place de l'état des
  inscriptions (« Nb inscrits » du Sheet n'est pas lu, « demander avant ») ; un Sheet injoignable
  n'y est pas signalé (les évènements de l'app restent).
- **Reste** : rien de C8. L'avertissement « Cases vides : … » du panneau du jour (après C3) attend
  toujours le branchement de `casesVides` (U2 et U6 sont désormais fusionnés ici) ; l'envoi réel de
  la ligne de C7 se vérifie en ligne (spec, § Réussite).
- **Pour Timothée** : rien à publier (C1 à C4 ne touchent pas `firestore.rules` ; C3 ouvre
  seulement l'entrée de menu déjà prévue par U6) ; relire les mots 中文 de `calendrier` dans
  `src/locales/zh-CN.json` (`只看我的`, `活动（Sheet）`, `读取自活动表格（Sheet）`,
  `无法读取活动表格（Sheet）…`, `这天没有安排。`) et ceux de `src/lib/calendrier/entrees.ts` (`司会：`, `已报名 4/10`, `截止`, `舞台`,
  `早餐`, `空闲`, `主日学`, `首`) ; pour C4, `视图`, `月`, `日程`, `全部`, `来源`, `打开`,
  `显示{{mois}}` (« 显示11月 »), `到{{mois}}底都没有安排。` et la légende (`calendrier.legende`) ;
  pour C5, `新建`, `新建{{date}}的活动`, `新建{{date}}截止的任务`. C5 ne touche ni `access.ts` ni
  `firestore.rules` : rien à publier.
  Pour C6, les mots de `calendrier.deplacer` (`改期…`, `改期「{{titre}}」`, `新日期`,
  `放下即可改期`, `通知已报名的人（{{count}}）`, `通知会议成员`, `他们会在明天早上的提醒里看到。`,
  `关联任务不会改期：{{liste}}`, `{{jour}}的空闲时段`, `取消`, `改期`, `好`, `改期没有保存，请重试。`,
  `不能早于今天`, `这天舞台不开放`, `这天没有空闲时段`) et la question
  « 把「…」从10月15日（周四）改到10月14日（周三）？ » (`questionDeplacement`). C6 ne touche ni
  `access.ts` ni `firestore.rules` (les règles d'aujourd'hui permettent déjà ces écritures, champ
  `deplacement` compris) : rien à publier.
  Pour C7, les deux lignes 中文 de `src/lib/calendrier/prevenir.ts` et
  `src/lib/reunions/rappels.ts` : « 活动改期：{titre} 改到 10月9日 19:00。» et le titre « 活动改期 ». C7
  ne touche ni `access.ts` ni `firestore.rules` (le cron lit avec le compte de service) : rien à
  publier. La requête `deplacement.le >= …` du cron se sert de l'index simple automatique de
  Firestore, comme `compteRendu.le` : rien à créer.
  Pour C8 : rien à publier (`access.ts` ne fait que rendre le widget permis ; ses réglages vivent
  dans `backOffice/{uid}`, dont la règle vient de B5) ; relire les mots 中文 `近几天`, `本周`,
  `未来十四天没有安排。`, `本周没有其他安排。`, `无法读取活动表格（Sheet），其中的活动暂不显示。`,
  `来源` (réglages), `活动表` (widget 3), et les jours « 今天 », « 周六 3日 »
  (`src/lib/calendrier/widget.ts`).
