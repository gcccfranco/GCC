# Spec — Lot AS : une seule feuille « Réserver », les fêtes dans Évènements, l'évènement épinglé en grand, des couleurs pour les salles

Planche : `docs/planches/planche-reserver-unique-fetes.html` (artefact privé « Lot AS : une feuille Réserver, les fêtes
dans Évènements, des couleurs pour les salles », version du 17/11/2026). Prolonge `docs/spec-salles.md` (lots AR, lot 5,
AR19 à AR23) et `docs/spec-scene-qui-autre-moment.md` (lot AQ). Remplace la proposition de la dernière entrée du
§ Avancement de `spec-salles.md` (17/11).

## Les mots de Timothée (17/11/2026), dans l'ordre

1. Capture de Salles, feuille « Réserver une salle », Scène choisie un mardi de la saison de Noël, « Réserver » grisé,
   message « Pendant la saison de Noël 2026, la Scène se réserve depuis sa page » : « La scène doit être réservable
   hors noel et paques aussi ».
2. « Est ce que ça ne fait pas trop redondant ? Peut etre fusionner le formulaire des fêtes avec celui de la
   réservation des salles nan? »
3. « à ce moment là il faut du coup mettre Noel et Paques dans l'onglet évènement à la place d'avoir des trucs séparés
   nan? » ; « go » pour la planche.
4. Sur Salles au téléphone : « Peut être ajouter des couleurs pour les salles ça fait un peu triste. »
5. Sur la planche : « Les groupes ont déjà des couleurs attitrés, tu peux utiliser ces couleurs directement. Pour
   l'affichage de la fête il faudrait qu'elle s'affiche 2 mois avant la fête je pense pas trop tot parce que sinon ça
   prend de l'espace pour rien. Si on épingle un évènement ce serait bien que ça s'affiche comme pour les fêtes en
   grand comme ça et s'il y a une image il faudrait voir pour la disposition »
6. Sur la planche reprise : « Je suis ok avec la nouvelle version, on va pas la lancer tout de suite. Lance une
   nouvelle session le 21/11/2026 à 12h01 pour coder tout. Tu as mon go pour tout » → **go pour tout le lot AS**,
   toutes tranches, codage à partir du 21/11/2026 à 12:01 (pas de mise en ligne : `main` reste à Timothée).

## Décisions

« OK avec la nouvelle version » vaut acceptation des propositions de la planche (questions 1 à 16), piste A partout.

| # | Décision | D'où |
|---|---|---|
| AS1 | **Une seule feuille « Réserver »** : celle de Salles (`FeuilleReserver.tsx`), ouverte de Salles, de la Grille, de la page d'une fête et de la carte de la fête. La feuille de la fête (`CreneauForm.tsx`) disparaît. | Mots 2 ; planche A. |
| AS2 | **La Scène se réserve toujours.** Le message `salles.sceneSaison` et la condition `!fete` de `pret` disparaissent. | Mots 1. |
| AS3 | **La question « C'est pour <fête> ? »** (piste A) : sous la ligne Scène, en retrait, deux choix segmentés « Oui, pour Noël » / « Non », **seulement** si la Scène est choisie, que la date tombe dans la saison d'une fête ouverte (non fermée, non brouillon) et que la personne peut réserver pour cette fête. Aucune réponse d'avance depuis Salles (le bouton dit « Dis si c'est pour Noël » tant qu'on n'a pas répondu) ; « Oui » d'avance quand on vient de la page ou de la carte de la fête. | Planche Q1. |
| AS4 | **Oui** : la ligne Scène prend la teinte du bleu scène à 8 % ; « Pour qui » devient les pastilles des familles de la fête (`FAMILLES`, restreintes par « Qui peut réserver », plus « Autre… » au bout de la dernière rangée), **plusieurs choix** ; « Pour quoi » devient les cinq choix de la fête (Séance louange, Chant, Danse, Sketch, Spectacle) ; « Note · facultatif ». La réservation porte `fete`, `qui[]`, `note` (modèle AR20) et suit les règles de la fête (AR21). **Non** : liste ordinaire de Salles, réservation sans `fete`. Ordre des champs identique dans les deux cas : « Pour qui » puis « Pour quoi ». | Planche Q2, Q3 ; critique. |
| AS5 | **Personne non permise ou fête fermée** : la question ne paraît pas ; une ligne sous Scène, au corps et à la couleur atténuée de « Libre jusqu'à 22:00 » : « Noël 2026 : réservé aux groupes et à l'EDD. Ta réservation sera ordinaire. » / « Réservations de Noël 2026 fermées. Ta réservation sera ordinaire. ». | Planche. |
| AS6 | **Répétitions** : pendant les plages de la fête, la Scène se réserve aussi en ordinaire ; le premier qui réserve l'a ; seul le refus de chevauchement (SA8) protège. | Planche Q5. |
| AS7 | **Modifier** : « pour la fête » ne se change pas (les rules l'interdisent déjà) ; la feuille l'affiche en lecture (« Pour Noël 2026 ») ; pour changer, supprimer et refaire. | Planche Q6. |
| AS8 | **Rail de la section Église à deux onglets** : « Évènements · Salles ». Les pages `/evenements/scene`, `/evenements/scene/noel`, `/evenements/scene/paques` restent (liens déjà envoyés, rappels) et allument « Évènements ». Sous-titre « Évènements, salles et fêtes » / « 活动、场地和节日 » inchangé. Remplace la partie « Pâques · Noël » d'AR2. | Mots 3 ; planche Q7, Q10. |
| AS9 | **Page de la fête** : un seul grand titre (« Noël 2026 ») ; l'en-tête de section devient compact (petit « Évènements » au-dessus du rail, sans sous-titre) ; au téléphone ce petit en-tête est un retour « ‹ Évènements » ; dès la tablette, le rail suffit. Contenus inchangés (état, mes réservations, semaines et fenêtres libres, ordre de passage, années passées) ; « Réserver » et une fenêtre libre ouvrent la feuille unique (AS3, « Oui » d'avance, moment pré-rempli). Halo fondu jusqu'au transparent sur ses bords. | Planche, critique. |
| AS10 | **Carte de la fête en haut d'Évènements** (piste A) : visible **deux mois avant le jour J** (Noël 24/12 → dès le 24/10 ; Pâques → J − 2 mois) **jusqu'au soir du jour J**, même si les réservations ouvrent plus tôt ; puis la fête passe dans « Passés » (pavé de date en bleu scène, vers sa page). Hors de cette fenêtre, rien. Carte : aplat bleu scène `#3f51a3`, texte blanc, rayon 16, titre, date en toutes lettres, « dans N jours », état ; réservations ouvertes : « Réserver la scène » (pilule blanche) + « Voir la fête » ; pas encore ouvertes ou fermées : texte d'état et « Voir la fête » seul. Connecté seulement (comme Salles). Une seule édition à la fois par fête (`editionsAffichees`). | Mots 5 ; planche Q4, Q9. |
| AS11 | **Évènement épinglé en grand** : un évènement daté (pas seulement une info) peut être épinglé, par qui peut le modifier (`canEditEvenement`), avec la case « Épinglée » / « 置顶 » déjà présente pour les infos. Il s'affiche en grande carte en haut d'Évènements, sous la carte de la fête : **sans image**, aplat encre neutre (`#1c1c1e`, `#2c2c2e` en sombre), texte blanc ; **avec image**, disposition **I1** : `images[0]` en tête 16:9 recadrée au centre (cadre de `Banniere`), texte dessous sur fond de carte. Titre, date en toutes lettres, heure et salle, « dans N jours » ; action « Je m'inscris » si `lienExterne` ou inscriptions ouvertes, sinon « Voir ». Il quitte la grande carte tout seul à sa fin (date de fin, sinon le jour même) ou à `expiresAt` s'il vient avant, sans rien réécrire. Sa ligne du mois n'est pas répétée tant qu'il est en grand. | Mots 5 ; planche Q12, Q14, Q15, Q16. |
| AS12 | **Plusieurs grandes cartes** : la fête d'abord, puis les évènements épinglés. Téléphone : empilées ; tablette portrait : côte à côte ; volet liste (tablette paysage, ordinateur) : empilées, largeur du volet. **Deux évènements épinglés ou plus** : une rangée qui défile de côté, la suivante dépassant (trois au plus en grand ; au-delà, petites lignes « À la une »). Les infos épinglées restent de petites lignes « À la une ». | Planche Q13. |
| AS13 | **Couleurs des salles** (piste 1) : chaque salle prend la **couleur attitrée de son groupe**, sans couleur nouvelle (`src/lib/serviceColors.ts`) : Grande salle `#2d5a65` (Culte Francophone), Scène `#3f51a3`, Salle Fidélité `#a03030`, Salle Paix `#6b4a8e`, Salle Amour `#a21caf`, Salle Bonté `#8b4a2e`, Salle 中班 `#3b6d11` (EDD), Salle imprimante et Salle de réunion `#64748b` (neutre). Variantes sombres par `couleurSombre` (`src/lib/couleurSombre.ts`). Emplois : pastille de 9 px devant le nom (Liste, feuille), fond du ruban à 14 %, en-tête de colonne de la Grille (fond 13 %, filet de 2 px) ; titres de groupe en gris. « Libre » en encre normale, le mot en graisse 600 (pas de vert : il se confondrait avec l'EDD). Les blocs d'occupation gardent `couleurDe`. | Mots 4 et 5 ; planche Q11. |

## Règles

| # | Règle |
|---|---|
| RS1 | `saisonSceneDu(date, scene)` (`src/lib/salles/occupations.ts`) rend aussi l'état de la fête pour la personne : `{ fete, annee, lien, nom, ouverte, permis, quiPermis }` (ou une fonction voisine, pure, testée) ; une fête **fermée** n'est plus ignorée : elle rend `ouverte: false` pour que la feuille écrive AS5. |
| RS2 | `pret` (feuille) : moment valide, salle libre, `quoi` choisi ; si la question est posée, une réponse ; si Oui, au moins un `qui`. Le refus de chevauchement (SA8) et « Décaler » sont inchangés et s'appliquent aussi à Oui. |
| RS3 | Enregistrer avec Oui écrit la réservation de fête du modèle AR20 (`salle: "scene"`, `fete`, `qui`, `note`, `pour` = libellé des `qui`, `quoi` = un des cinq choix) ; `signalerConflit` comme aujourd'hui. Avec Non : réservation ordinaire (SA6, SA7). |
| RS4 | Ouvrir la feuille depuis la fête : `{ salle: "scene", pourFete: true, date, debut, fin }` (fenêtre libre touchée ou défauts actuels de la fête). |
| RS5 | Carte de la fête : fonction pure `feteEnVue(editions, aujourdHui)` → l'édition dont `jourJ − 2 mois ≤ aujourdHui ≤ jourJ`, ou rien ; état « ouvertes / pas encore / fermées » d'après la saison et `fermees`. |
| RS6 | « Passés » (`agenda.ts`) reçoit les fêtes passées depuis moins de 92 jours (fonction pure), triées avec les autres. |
| RS7 | Évènement en grand : fonction pure `epinglesEnGrand(evenements, maintenant)` → épinglés, datés, non finis, non expirés, triés par date, trois au plus. |
| RS8 | Couleurs des salles : une seule table `COULEUR_SALLE: Record<SalleId, string>` (dans `src/lib/salles/salles.ts`), valeurs prises par référence à `CATEGORY_COLORS` / `PLANNING_COLORS`, aucune valeur hexadécimale nouvelle. |

## Permissions

Aucune règle Firestore nouvelle : `reservations/{id}` accepte déjà `fete`, `qui`, `note` et vérifie `reservable(fete,
qui)` (T5a) ; une réservation de la Scène sans `fete` passe déjà ; `fete` ne se modifie pas (AS7). Épingler un
évènement : `epingle` n'est pas filtré par `firestore.rules` (à **vérifier** en T5 ; si un `hasOnly` le bloque pour un
évènement daté, l'ajouter en double `access.ts` / `firestore.rules` et le dire à Timothée). Client : `canReserverPour`
inchangé. **Rien à publier** sauf si T5 trouve le contraire. Les rules de T5a (lot 5) restent à publier par Timothée
avant toute mise en ligne.

## Libellés (FR · 中文) — avec `i18n-sync`

| Clé (proposée) | FR | 中文 |
|---|---|---|
| `salles.feuille.pourFete` | C'est pour {{fete}} ? | 这是为{{fete}}预订吗？ |
| `salles.feuille.pourFeteOui` | Oui, pour {{court}} | 是，为{{court}} |
| `salles.feuille.pourFeteNon` | Non | 不是 |
| `salles.feuille.pourFeteRepondre` | Dis si c'est pour {{court}} | 请先选择是否为{{court}} |
| `salles.feuille.pourFeteLecture` | Pour {{fete}} | 为{{fete}} |
| `salles.feuille.feteNonPermis` | {{fete}} : réservé à {{qui}}. Ta réservation sera ordinaire. | {{fete}}：仅限{{qui}}预约。你的预约将是普通预约。 |
| `salles.feuille.feteFermee` | Réservations de {{fete}} fermées. Ta réservation sera ordinaire. | {{fete}}预约已关闭。你的预约将是普通预约。 |
| `salles.feuille.note` | Note · facultatif | 备注 · 选填 |
| `evenements.fete.dansJours` | dans {{n}} jours | {{n}} 天后 |
| `evenements.fete.reserver` | Réserver la scène | 预约舞台 |
| `evenements.fete.voir` | Voir la fête | 查看节日 |
| `evenements.fete.ouvertesJusqua` | Scène ouverte aux réservations jusqu'au {{date}} | 舞台开放预约至{{date}} |
| `evenements.fete.desLe` | Réservations de la scène dès le {{date}} | 舞台预约将于{{date}}开放 |
| `evenements.fete.fermees` | Réservations de la scène fermées | 舞台预约已关闭 |
| `evenements.epingle.voir` | Voir | 查看 |

« Je m'inscris » / « 我来报名 » existent déjà. Supprimer : `salles.sceneSaison`, `salles.sceneSaisonLien`, les clés
propres à `CreneauForm` devenues orphelines, et (reste du lot 5) `creneauxDuJour_*`, `saison.duree`.

## Ce qui disparaît / ce qui ne change pas

- **Disparaît** : `CreneauForm.tsx` (vérifier d'abord : `QuiChecklist` qu'il exporte sert à `OrdrePassage.tsx` ; le
  déplacer, ne pas le perdre) ; le message `sceneSaison` ; les onglets Pâques et Noël du rail (`EvenementsTabs.tsx`).
- **Ne change pas** : les adresses `/evenements/scene…` ; le Back-Office des fêtes (saison, plages, « Qui peut
  réserver », fermeture, ordre de passage) ; le modèle `reservations/{id}` ; `couleurDe` des occupations ; Salles
  hors Scène.

## Tranches (une session par tranche ; chacune lance la suivante — règle du `CLAUDE.md`)

| # | Tranche | Fichiers principaux | Tests d'abord |
|---|---|---|---|
| T1 | **La Scène réservable toujours, la question « pour la fête » dans Salles** (répond aux mots 1) : AS2 à AS7, RS1 à RS3, libellés de la feuille. | `FeuilleReserver.tsx`, `SallesClient.tsx`, `occupations.ts`, locales | `tests/salles-scene.spec.ts` (bloc T5b réécrit : Scène en saison réservable ; question ; Oui → réservation avec `fete` ; Non → sans ; non permis / fermée → ligne AS5 ; refus de chevauchement avec Oui) |
| T2 | **La page de la fête ouvre la feuille unique** : AS1, AS9 (Réserver, fenêtres libres), RS4 ; `CreneauForm` retiré (`QuiChecklist` déplacé). | `Entrainements.tsx`, `FeteClient.tsx`, `CreneauForm.tsx`, `OrdrePassage.tsx` | `scene-paques-noel`, `scene-qui`, `scene-autre-moment`, `scene-saison`, `programme-scene`, `scene-des-fetes` réécrites là où elles remplissaient l'ancienne feuille |
| T3 | **Rail à deux onglets, en-tête compact de la page de la fête** : AS8, AS9 (titre, retour, halo). | `EvenementsTabs.tsx`, `SectionEvenements.tsx`, `FeteClient.tsx` | `eglise-entree`, `pages-en-grand-evenements` (+ nouvelle `tests/fete-en-tete.spec.ts` dans `SPECS_GRAND_ECRAN`) ; `critique-design` après |
| T4 | **La carte de la fête dans Évènements, la fête passée dans Passés** : AS10, RS5, RS6. | `CalendrierClient.tsx`, composant neuf `CarteFete.tsx`, `agenda.ts`, `src/lib/scene/fetes.ts` | nouvelle `tests/evenements-fete.spec.ts` (J−2 mois −1 jour : rien ; J−2 mois : carte ; ouvertes / pas encore / fermées ; jour J ; lendemain : dans Passés ; sans compte : rien) dans `SPECS_GRAND_ECRAN` ; `critique-design` après |
| T5 | **L'évènement épinglé en grand** : AS11, AS12, RS7 ; case « Épinglée » pour tout évènement ; vérifier les rules (§ Permissions). | `EvenementForm.tsx`, `CalendrierClient.tsx`, composant neuf `CarteEpingle.tsx`, `src/lib/evenements/agenda.ts` | nouvelle `tests/evenements-epingle.spec.ts` (sans image ; avec image paysage et portrait ; fête + évènement ; deux et quatre épinglés ; fin et `expiresAt`) dans `SPECS_GRAND_ECRAN` ; `evenements.spec` ; `critique-design` après |
| T6 | **Couleurs des salles** : AS13, RS8 (Liste, Grille, feuille, clair et sombre). | `salles.ts`, composants de Salles (Liste, Grille, `FeuilleReserver.tsx`) | `salles-liste`, `salles-grille`, `salles-reserver` (pastille et couleur attendues) ; `critique-design` après. **Fin de lot** : specs du lot et des pages touchées (Salles, Scène, Évènements, `eglise-entree`, `back-office-coupe`) sur les cinq projets |

Tests : Playwright, trois appareils toujours, cinq projets pour l'agencement ; données simulées
(`tests/helpers/fakeSession.ts`), noms inventés. Tester un chant FR et un ZH n'a pas lieu d'être ici (aucune page de
chant touchée) ; vérifier l'écran en 中文 à chaque tranche qui ajoute des libellés.

## Lancement

Go de Timothée pour tout le lot (17/11/2026, mot 6). **Lancement le 21/11/2026 à 12:01** (heure de Paris) : un message
programmé réveille la session `session_01UMdfuZmDFSArzAmTjkFyHN`, qui compte les chantiers (limite de cinq), puis lance
l'orchestratrice de T1 (`create_session`, `source_revision` et `outcome_branch` = `claude/corrections-design`, Opus,
consigne d'économie). Chaque tranche lance la suivante ; la mise en ligne reste à Timothée.

## Avancement

- 17/11/2026 — Planche publiée (deux versions), retours de Timothée intégrés, spec écrite, **go pour tout le lot**,
  lancement programmé le 21/11/2026 à 12:01.
