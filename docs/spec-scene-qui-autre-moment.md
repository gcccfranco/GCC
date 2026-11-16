# Spec — Scène : « Qui » élargi et « Réserver un autre moment » (AQ)

- **Origine** : retours rapportés par Timothée le 16/11/2026 :
  - « Scène : possibilité d'ajouter d'autres créneaux/dates. Les dimanches avant noël s'affichent par défaut et sont
    prêts à être remplis (état actuel). »
  - « Scène : ajouter dans les choix de "qui" un moyen d'écrire soi-même, car là actuellement il manque intergroupe,
    interfranco. »
- **Réponses de Timothée (16/11/2026)** : « Intergroupe et Interfranco c'est pour les séances de Louange de ces
  cultes » ; « Jour isolé et la personne n'a pas trouvé le réglage, ce qui signifie que c'est pas pratique » ; « Peut
  à la place de mettre des plages, laisser les personnes mettre le temps qu'ils veulent réserver ».
- **Statut** : spec écrite le 16/11/2026 ; propositions SQ3, SQ5, SQ6, SQ9 à SQ13 **à valider** ; **attend le go**.
- **Base de code** : `claude/corrections-design` à `4f1134e`.
- **Suite** : l'occupation des salles (`docs/spec-salles.md`, AR) reprendra la feuille « un autre moment » (date, de, à).
  Ce lot ne change ni la grille des dimanches ni les réglages de la saison.

## Ce que le code fait aujourd'hui

- **« Qui »** : dix valeurs en dur (`QUI`, `src/types/programme.ts`), les mêmes pour les réservations et l'ordre de
  passage (décisions 34 et 45 de `docs/spec-chants-fetes.md`). Une valeur hors liste encore en base (敬拜团, Jeunes,
  Chorale) s'affiche cochée, grisée, « retiré » (`CreneauForm.tsx`, `QuiChecklist`).
- **Ce que porte une valeur de la liste** : le rappel envoyé aux membres de sa catégorie (`QUI_CATEGORY`,
  `src/lib/scene/rappels.ts` ; sans correspondance, seul l'auteur est prévenu) ; le réglage « Qui peut réserver » de
  la saison (`FAMILLES`, `src/lib/scene/saison.ts`) ; les ayants droit de la setlist de fête (`ayantsDroitDuQui`,
  `src/lib/fetes/droits.ts`).
- **Intergroupe et Interfranco existent déjà dans l'app** comme catégories de planning, avec leurs noms en 中文
  (`categories.Intergroupe` 联合聚会, `categories.Interfranco` 法语联合聚会, `src/locales/zh-CN.json`).
- **Jours et heures** : la coordination règle la saison au Back-Office (période, jours de la semaine, plages, durée
  d'un créneau, `SaisonForm`) ; les membres prennent un créneau de cette grille. Un jour isolé ne se règle pas, et la
  page où l'on réserve ne dit pas que d'autres jours sont possibles.
- **Une réservation à une heure libre est déjà lisible** : `Creneau` porte un jour et deux heures quelconques ; hors
  grille, elle s'affiche à son heure et absorbe les créneaux qu'elle chevauche (`lignesDuJour`). La coordination la voit
  avec une pastille « Hors grille », comptée comme une anomalie (`horsGrille`, `ToutesReservations`, `CetteSemaine`).
- **Règles** : `reservable()` (`firestore.rules`) ne vérifie que `ouvert`, `fermees` et `quiAutorises` ; ni la date ni
  l'heure. La coordination et qui gère un planning passent sans cette vérification.

## Décisions

| # | Question | Réponse |
|---|---|---|
| SQ1 | Intergroupe, Interfranco | **Timothée, 16/11** : les séances de louange de ces cultes. Deux valeurs ajoutées à `QUI`, après « Franco », dans la famille Louange de « Qui peut réserver ». |
| SQ2 | Leurs noms en 中文, leurs rappels | **Du code** : libellés des catégories existantes (联合聚会, 法语联合聚会) ; rappel aux membres de la catégorie du même nom. |
| SQ3 | Qui saisit leurs chants de fête | **Proposé** : comme Culte Francophone, les membres de l'équipe Louange de l'organigramme. |
| SQ4 | Écrire soi-même | **Timothée, 16/11**. Une pastille « Autre… » ouvre un champ court (40 caractères) ; une seule valeur libre par réservation ou par passage ; elle est stockée telle quelle dans `qui`. |
| SQ5 | Qui voit « Autre… » | **Proposé** : tout le monde quand la saison ne limite pas « Qui peut réserver » ; sinon la coordination et qui gère un planning (les règles refuseraient un simple membre). Aucune règle à publier. |
| SQ6 | Ce qu'une valeur libre n'a pas | **Proposé** : pas de rappel de groupe (l'auteur seul), pas d'ayant droit pour les chants (la coordination seule). Un texte égal à une valeur de la liste ou à son libellé devient cette valeur. Elle s'affiche normalement ; « retiré » reste aux trois anciennes valeurs. |
| SQ7 | Ordre de passage | **Décision 45 inchangée** : une seule liste ; « Autre… » y est aussi. |
| SQ8 | Autres créneaux, autres dates | **Timothée, 16/11** (jour isolé ; réglage introuvable ; durée libre). Un bouton « Réserver un autre moment » dans le volet Entraînements : une date, « de », « à », puis quoi, qui, note. La grille reste proposée par défaut. |
| SQ9 | Qui peut le faire | **Proposé** : toute personne qui peut réserver un créneau (même règle, même « Qui peut réserver »). |
| SQ10 | Bornes | **Proposé** : dans la période des réservations, à partir d'aujourd'hui ; pas de 15 minutes ; fin après le début, le même jour ; refus d'un chevauchement, comme aujourd'hui. Au-delà de la fermeture, la coordination déplace la date de fermeture. |
| SQ11 | « Hors grille » | **Proposé** : un autre moment porte `libre: true` ; il n'est ni marqué ni compté « Hors grille ». La pastille reste pour une réservation laissée hors grille par un changement de saison. |
| SQ12 | Affichage | **Proposé** : un jour hors des jours de la saison qui porte une réservation apparaît dans sa semaine (App et Back-Office), avec ses seules réservations. |
| SQ13 | Modifier, déplacer | **Proposé** : « Modifier » d'un autre moment rouvre la même feuille, date et heures comprises. « Déplacer » vers un créneau de la grille retire `libre`. |

## Modèle

- `QUI` : `…, "Franco", "Intergroupe", "Interfranco", "EDD 小班", …`. `QUI_RETIRES = ["敬拜团", "Jeunes", "Chorale"]`.
- `FAMILLES`, clé `louange` : `["Franco", "Intergroupe", "Interfranco"]`.
- `Creneau.libre?: boolean` : `true` pour un autre moment ; absent sinon. `dimanche`, `debut`, `fin` inchangés.
- Aucun champ ajouté à `Programme`. Aucune modification de `firestore.rules`.

## Règles

**« Qui » (tranche SQ-A)**

- SQ-R1. `libelleQui` : Intergroupe et Interfranco prennent en 中文 le libellé de leur catégorie.
- SQ-R2. `QUI_CATEGORY` : `Intergroupe → "Intergroupe"`, `Interfranco → "Interfranco"`.
- SQ-R3. `ayantsDroitDuQui` : Intergroupe et Interfranco comme « Franco » (SQ3).
- SQ-R4. Une saison enregistrée avant ce lot ne perd rien : `famillesDe` tient une famille pour cochée dès qu'**une**
  de ses valeurs est permise (aujourd'hui : toutes). À l'enregistrement suivant, la famille entière est écrite. Tant
  que la coordination n'a pas réenregistré, un membre ne se voit proposer que les valeurs stockées (`quiPermis`).
- SQ-R5. « Autre… » : dernière pastille de « Qui », montrée selon SQ5. Cochée, elle ouvre le champ ; le bouton plein
  reste « Choisis quoi et qui » tant que le champ est vide. Texte rogné, 40 caractères au plus.
- SQ-R6. Une réservation ou un passage qui porte une valeur libre se rouvre avec « Autre… » cochée et le champ rempli.
- SQ-R7. Une valeur libre s'affiche partout telle quelle (lignes, rappel de l'auteur, Back-Office, ordre de passage).

**Un autre moment (tranche SQ-B)**

- SQ-R8. Le bouton est en bas du volet Entraînements, visible quand les réservations sont ouvertes et que la personne
  peut réserver (`canReserverPour`).
- SQ-R9. La feuille : date (bornée par SQ10), « de » et « à » (pas de 15 minutes), puis quoi, qui, note comme la
  feuille « Réserver ». Le refus d'un chevauchement se dit dans la feuille, avec l'heure prise.
- SQ-R10. L'enregistrement suit le chemin de « Réserver » (même écriture, même signalement de conflit
  `/api/scene/conflit`), avec `libre: true`.
- SQ-R11. La liste des jours d'une semaine = jours de la saison + jours qui portent une réservation (SQ12). Un jour
  ajouté n'a pas de créneau libre à proposer.
- SQ-R12. `horsGrille()` ignore un créneau `libre` (SQ11) : filtres et comptes du Back-Office suivent.

## Libellés (FR · 中文, 中文 à relire par Timothée)

| Clé | FR | 中文 |
|---|---|---|
| `planning.programme.quiAutre` | Autre… | 其他… |
| `planning.programme.quiAutreChamp` | Qui ? | 谁？ |
| `planning.saison.autreMoment` | Réserver un autre moment | 预约其他时间 |
| `planning.saison.autreMomentTitre` | Un autre moment | 其他时间 |
| `planning.saison.autreDate` | Date | 日期 |
| `planning.saison.autreDe` · `autreA` | de · à | 从 · 到 |
| `planning.saison.autreHorsPeriode` | Choisis une date entre le {{debut}} et le {{fin}}. | 请选择 {{debut}} 至 {{fin}} 之间的日期。 |

Le guide (`/guide`, « Entraînements ») gagne une phrase sur l'autre moment, dans les deux langues.

## Tranches de code

Deux tranches, dans cet ordre (elles touchent la même feuille, `CreneauForm.tsx`) ; une session par tranche.

- **SQ-A — « Qui »** : `src/types/programme.ts`, `src/lib/scene/saison.ts` (`FAMILLES`, `famillesDe`),
  `src/lib/scene/rappels.ts`, `src/lib/fetes/qui.ts`, `src/lib/fetes/droits.ts`, `CreneauForm.tsx` (feuille et
  `QuiChecklist`), libellés. Règles SQ-R1 à SQ-R7.
- **SQ-B — un autre moment** : `Creneau.libre` et sa lecture (`src/lib/firebase/programmes.ts`), `saison.ts`
  (`horsGrille`, jours d'une semaine), `Entrainements.tsx`, `CreneauForm.tsx`, vues du Back-Office (`CetteSemaine`,
  `ToutesReservations`), libellés, guide. Règles SQ-R8 à SQ-R12.

Pas de planche : une pastille et un champ dans une feuille existante, un bouton et une feuille au gabarit de
« Réserver ». Captures des quatre dispositions pour la relecture ; `critique-design` après SQ-B.

## Tests Playwright à écrire d'abord

Trois appareils ; l'agencement du volet Entraînements est déjà sur les cinq projets
(`tests/scene-paques-noel.spec.ts`) : y ajouter, ou inscrire une spec nouvelle à `SPECS_GRAND_ECRAN`. Noms fictifs.

- Logique pure : `QUI` et `FAMILLES` ; `libelleQui` des deux nouveaux, FR et 中文 ; `quiCategory` ;
  `ayantsDroitDuQui("Intergroupe")` ; `famillesDe(["Franco"])` rend `louange` ; texte libre égal à « Gp Joie » ou à
  « Culte Francophone » → la valeur de la liste ; `horsGrille` ignore `libre` ; jours d'une semaine avec un mercredi
  réservé.
- Feuille « Réserver » : Intergroupe et Interfranco proposés ; « Autre… » → champ → enregistré tel quel (lu dans les
  écritures) ; champ vide → bouton inactif ; saison limitée → pas de « Autre… » pour un membre, présent pour la
  coordination.
- Réouverture d'une réservation à valeur libre : « Autre… » cochée, champ rempli ; une ancienne valeur reste « retiré ».
- Ordre de passage : « Autre… » dans `QuiChecklist`.
- Autre moment : bouton visible pour qui peut réserver, absent quand les réservations sont fermées ; un mercredi
  18:30–20:00 → la ligne apparaît dans sa semaine, sans pastille « Hors grille » ; chevauchement refusé ; date hors
  période refusée ; « Modifier » change l'heure.
- Back-Office : l'autre moment est dans « À venir », pas dans « Hors grille ».
- 中文 : la feuille et le bouton, un chant de fête ZH et un FR à l'écran de l'ordre de passage (règle de `CLAUDE.md`).

## À la mise en ligne

- Si la saison de Noël limite « Qui peut réserver » : la coordination rouvre ce réglage et l'enregistre, pour que
  Intergroupe et Interfranco entrent dans Louange (SQ-R4).
- 中文 nouveaux à relire par Timothée.

## Hors périmètre

- Les salles (AR, `docs/spec-salles.md`).
- Retirer un dimanche de la grille, réserver après la date de fermeture, plusieurs valeurs libres, liste de « Qui »
  réglable par la coordination.

## Avancement

- 16/11/2026 : spec écrite d'après les retours et les réponses de Timothée ; propositions à valider ; attend le go.
