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
7. Le même jour, après une discussion avec une responsable (captures d'une messagerie, noms hors dépôt) : « grande
   salle = scène finalement » (« C'est vrai je vais changer ça ») ; pour un atelier tenu par deux personnes, « il faut
   qu'elles puissent mettre leurs prénoms » ; « dans le formulaire de création d'évènement il faut pouvoir réserver une
   salle si besoin ». Réponses à trois questions : fusionner la Grande salle et la Scène, rules à republier (« Oui ») ;
   « à la place de autre il faudrait mettre la liste des personnes qui ont un compte et à ce moment là ils peuvent
   cocher une ou plusieurs personnes, et la coordination peut annuler et donner le motif » ; « Si l'évènement à lieu à
   l'église, oui proposer de réserver une salle à l'église si le lieu n'est pas à l'église pas besoin ».

## Décisions

« OK avec la nouvelle version » vaut acceptation des propositions de la planche (questions 1 à 16), piste A partout.
**AS14 (Grande salle = Scène) s'applique à toutes les décisions** : là où AS2 à AS13 disent « Scène », lire « Grande
salle » (la question « C'est pour Noël ? » se pose quand on choisit la Grande salle ; « Réserver la scène » devient
« Réserver la Grande salle » / « 预约大厅 » ; le bleu scène reste la couleur de la fête, pas d'une salle).

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

| AS14 | **Grande salle = Scène** : une seule salle « Grande salle » (huit salles au lieu de neuf), dans Salles, la Grille, la feuille, les formulaires d'évènement et la page de la fête. Remplace AR6 et la ligne Scène d'AR7 et d'AR9. Les réservations existantes `salle: "scene"` (fêtes de T5a, réservations ordinaires) se **lisent** comme la Grande salle (aucune réécriture des documents) ; les nouvelles s'écrivent `salle: "grande"`, fêtes comprises. Les règles de la fête (AR21, `reservable(fete, qui)`) s'appliquent à une réservation qui porte `fete`, quelle que soit sa salle. Les fenêtres libres de la page de la fête se calculent sur la Grande salle. | Mots 7 (« Oui, fusionner »). |
| AS15 | **« Autre… » devient « Des personnes… »** : dans « Pour qui », à la place du texte libre, la liste des personnes qui ont un compte (profils `users/{uid}`, nom affiché), avec une recherche par nom ; on coche une ou plusieurs personnes (pastilles des choisies). La réservation porte `personnes: { uid, nom }[]` (20 au plus) et `pour` = les noms joints (« Lina, Maé ») pour l'affichage. Vaut pour Salles et pour la fête (dans la fête, « Des personnes… » remplace « Autre… » au bout des familles ; « Qui peut réserver » ne restreint pas cette ligne si la fête autorise « Autre… » aujourd'hui, sinon elle est absente). Les anciennes valeurs libres se lisent telles quelles ; on ne peut plus en écrire. « Pour quoi » reste obligatoire. | Mots 7. |
| AS16 | **La coordination annule avec un motif** : partout où une personne de la coordination supprime la réservation **d'un autre** (Salles : détail d'une réservation et Grille ; page de la fête ; Back-Office des fêtes), « Supprimer » devient « Annuler la réservation… » : une feuille demande le motif (obligatoire, 1 à 200 caractères), puis la réservation est supprimée et une notification part à l'auteur **et** aux personnes cochées (AS15) : « Ta réservation de la Grande salle du mar. 8 déc., 19:00 – 20:00, a été annulée : <motif> ». L'auteur qui supprime la sienne : inchangé, sans motif. | Mots 7. |
| AS17 | **Formulaire d'évènement : « Où ? »** — d'abord « À l'église » / « Ailleurs » (choix segmenté). « À l'église » : « Réserver une salle ? » propose les salles libres au moment de l'évènement (champ `ChampSalle` actuel, SA12, refus de chevauchement inchangé) ; on peut ne pas en prendre (« Pas besoin de salle »), le lieu affiché est alors « Église ». « Ailleurs » : lieu en texte libre, aucune salle. Un évènement existant avec une salle s'ouvre sur « À l'église » ; avec un lieu libre, sur « Ailleurs ». Vaut aussi pour le formulaire de réunion. | Mots 7. |

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
| RS9 | Fusion (AS14) : une fonction `salleLue(id)` rend `"grande"` pour `"scene"` ; toutes les lectures (occupations, chevauchement, Grille, rappels, `listCreneaux`, Calendrier) passent par elle ; `lieuxLies` disparaît ou devient l'identité ; `SalleId` garde `"scene"` pour la lecture seulement. |
| RS10 | Personnes (AS15) : la liste vient des profils lisibles par tout connecté (choix assumé du `CLAUDE.md`) ; nom affiché = celui du profil ; la recherche est locale ; noms des tests inventés. |
| RS11 | Annulation (AS16) : nouvelle route `/api/salles/annulation` (POST, jeton Firebase de l'appelant, vérifie `isCoordination` côté serveur, relit la réservation, la supprime, envoie la notification par la voie des autres notifications push) ; clé anti-doublon. Routes API : 21 (`CLAUDE.md`, référence § Routes API). |
| RS8 | Couleurs des salles : une seule table `COULEUR_SALLE: Record<SalleId, string>` (dans `src/lib/salles/salles.ts`), valeurs prises par référence à `CATEGORY_COLORS` / `PLANNING_COLORS`, aucune valeur hexadécimale nouvelle. |

## Permissions

**Changements de `firestore.rules` (à publier par Timothée avant la mise en ligne, en même temps que celles de T5a)** :
(1) AS14 : `reservationValide()` n'accepte plus `"scene"` en création (lecture des anciens documents inchangée) ; les
champs de fête (`fete`, `qui`, `note`, `libre`) et `reservable(fete, qui)` valent pour toute réservation qui porte
`fete` (en pratique la Grande salle) ; (2) AS15 : champ `personnes` permis (liste de 20 au plus, chaque élément
`{uid: string, nom: string ≤ 60}`), `pour` ≤ 200 caractères ; (3) AS16 : rien (la suppression par la coordination est
déjà permise ; la route serveur passe par l'Admin SDK). Miroir client dans `src/lib/access.ts` (`canAnnulerReservation`
= `isCoordination` et pas l'auteur). Pour le reste :
Aucune autre règle Firestore nouvelle : `reservations/{id}` accepte déjà `fete`, `qui`, `note` et vérifie `reservable(fete,
qui)` (T5a) ; une réservation de la Scène sans `fete` passe déjà ; `fete` ne se modifie pas (AS7). Épingler un
évènement : `epingle` n'est pas filtré par `firestore.rules` (à **vérifier** en T6 ; si un `hasOnly` le bloque pour un
évènement daté, l'ajouter en double `access.ts` / `firestore.rules` et le dire à Timothée). Client : `canReserverPour`
inchangé. Publication : voir les trois points ci-dessus (et T6 si l'épinglage est bloqué). Les rules de T5a (lot 5) restent à publier par Timothée
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
| `salles.feuille.personnes` | Des personnes… | 指定人员… |
| `salles.feuille.chercherPersonne` | Chercher un nom | 搜索姓名 |
| `salles.annuler.titre` | Annuler la réservation… | 取消预约… |
| `salles.annuler.motif` | Motif (envoyé à l'auteur) | 原因（将发送给预约人） |
| `salles.annuler.notif` | Ta réservation de {{salle}} du {{date}}, {{de}} – {{a}}, a été annulée : {{motif}} | 你在{{date}} {{de}}–{{a}}的{{salle}}预约已被取消：{{motif}} |
| `evenements.form.ou` | Où ? | 地点？ |
| `evenements.form.aLEglise` | À l'église | 在教会 |
| `evenements.form.ailleurs` | Ailleurs | 其他地点 |
| `evenements.form.reserverSalle` | Réserver une salle ? | 预约场地？ |
| `evenements.form.pasBesoinSalle` | Pas besoin de salle | 不需要场地 |

« Je m'inscris » / « 我来报名 » existent déjà. Supprimer : `salles.sceneSaison`, `salles.sceneSaisonLien`, les clés
propres à `CreneauForm` devenues orphelines, et (reste du lot 5) `creneauxDuJour_*`, `saison.duree`.

## Ce qui disparaît / ce qui ne change pas

- **Disparaît** : la Scène comme salle à part (AS14) ; « Autre… » en texte libre (AS15) ; `CreneauForm.tsx` (vérifier d'abord : `QuiChecklist` qu'il exporte sert à `OrdrePassage.tsx` ; le
  déplacer, ne pas le perdre) ; le message `sceneSaison` ; les onglets Pâques et Noël du rail (`EvenementsTabs.tsx`).
- **Ne change pas** : les adresses `/evenements/scene…` ; le Back-Office des fêtes (saison, plages, « Qui peut
  réserver », fermeture, ordre de passage) ; le modèle `reservations/{id}` ; `couleurDe` des occupations ; Salles
  hors Scène.

## Tranches (une session par tranche ; chacune lance la suivante — règle du `CLAUDE.md`)

| # | Tranche | Fichiers principaux | Tests d'abord |
|---|---|---|---|
| T1 | **Grande salle = Scène** (AS14, RS9) : une seule salle ; anciennes réservations `scene` lues comme Grande salle ; fêtes sur la Grande salle ; rules (1) et `access.ts`. | `salles.ts`, `occupations.ts`, `reservations.ts`, `programmes.ts`, `rappels.ts`, Grille et Liste, `firestore.rules` | `salles-modele`, `salles-liste`, `salles-grille`, `salles-scene` (une ancienne réservation `scene` apparaît sur la Grande salle ; huit colonnes) |
| T2 | **La Grande salle réservable toujours, la question « pour la fête » dans Salles** (répond aux mots 1) : AS2 à AS7, RS1 à RS3, libellés de la feuille. | `FeuilleReserver.tsx`, `SallesClient.tsx`, `occupations.ts`, locales | `tests/salles-scene.spec.ts` (bloc T5b réécrit : Grande salle en saison réservable ; question ; Oui → réservation avec `fete` ; Non → sans ; non permis / fermée → ligne AS5 ; refus de chevauchement avec Oui) |
| T3 | **La page de la fête ouvre la feuille unique** : AS1, AS9 (Réserver, fenêtres libres), RS4 ; `CreneauForm` retiré (`QuiChecklist` déplacé). | `Entrainements.tsx`, `FeteClient.tsx`, `CreneauForm.tsx`, `OrdrePassage.tsx` | `scene-paques-noel`, `scene-qui`, `scene-autre-moment`, `scene-saison`, `programme-scene`, `scene-des-fetes` réécrites là où elles remplissaient l'ancienne feuille |
| T4 | **Rail à deux onglets, en-tête compact de la page de la fête** : AS8, AS9 (titre, retour, halo). | `EvenementsTabs.tsx`, `SectionEvenements.tsx`, `FeteClient.tsx` | `eglise-entree`, `pages-en-grand-evenements` (+ nouvelle `tests/fete-en-tete.spec.ts` dans `SPECS_GRAND_ECRAN`) ; `critique-design` après |
| T5 | **La carte de la fête dans Évènements, la fête passée dans Passés** : AS10, RS5, RS6. | `CalendrierClient.tsx`, composant neuf `CarteFete.tsx`, `agenda.ts`, `src/lib/scene/fetes.ts` | nouvelle `tests/evenements-fete.spec.ts` (J−2 mois −1 jour : rien ; J−2 mois : carte ; ouvertes / pas encore / fermées ; jour J ; lendemain : dans Passés ; sans compte : rien) dans `SPECS_GRAND_ECRAN` ; `critique-design` après |
| T6 | **L'évènement épinglé en grand** : AS11, AS12, RS7 ; case « Épinglée » pour tout évènement ; vérifier les rules (§ Permissions). | `EvenementForm.tsx`, `CalendrierClient.tsx`, composant neuf `CarteEpingle.tsx`, `src/lib/evenements/agenda.ts` | nouvelle `tests/evenements-epingle.spec.ts` (sans image ; avec image paysage et portrait ; fête + évènement ; deux et quatre épinglés ; fin et `expiresAt`) dans `SPECS_GRAND_ECRAN` ; `evenements.spec` ; `critique-design` après |
| T7 | **Couleurs des salles** : AS13, RS8 (Liste, Grille, feuille, clair et sombre ; huit salles depuis T1). | `salles.ts`, composants de Salles (Liste, Grille, `FeuilleReserver.tsx`) | `salles-liste`, `salles-grille`, `salles-reserver` (pastille et couleur attendues) ; `critique-design` après |
| T8 | **« Des personnes… » dans « Pour qui »** : AS15, RS10 ; rules (2). Interface : recherche + cases à cocher + pastilles des choisies, dans le style des listes groupées de la feuille (réutiliser un sélecteur de personnes existant s'il y en a un ; sinon décision déléguée de la session, écrite ici) ; `critique-design` après. | `FeuilleReserver.tsx`, feuille de la fête si encore distincte, `reservations.ts`, `firestore.rules`, `access.ts`, locales | `salles-reserver` (cocher deux personnes → `personnes` et `pour`) ; `scene-qui` ; ancienne valeur libre lue telle quelle |
| T9 | **La coordination annule avec un motif** : AS16, RS11 ; nouvelle route ; notification simulée dans les tests. | `src/app/api/salles/annulation/route.ts`, Salles (détail, Grille), page de la fête, Back-Office des fêtes, `access.ts`, `CLAUDE.md`, référence | nouvelle `tests/salles-annulation.spec.ts` (coordination : motif obligatoire, route appelée, réservation retirée ; auteur : suppression sans motif ; membre : pas de bouton) |
| T10 | **« Où ? » dans le formulaire d'évènement et de réunion** : AS17. `critique-design` après. **Fin de lot** : specs du lot et des pages touchées (Salles, Scène, Évènements, réunions, `eglise-entree`, `back-office-coupe`) sur les cinq projets. | `EvenementForm.tsx`, `ReunionForm.tsx`, `ChampSalle.tsx`, locales | `salles-evenement` (À l'église → salle proposée, « Pas besoin de salle » → lieu « Église » ; Ailleurs → lieu libre, aucune salle) ; `evenements.spec`, `evenements-equipe` |

**Deux files en parallèle** (Timothée, 21/11/2026, « Go ») : la chaîne n'est plus T1 → T10 dans l'ordre.
- **File A — Salles et fête** : T2 → T3 → T7 → T8 → T9 (T3 lance **T7** ; T4 est passée en file C). T9 finie : la file A s'arrête
  et écrit sa ligne ; si la file B est finie aussi, T9 fait la fin de lot (voir T10) au lieu de T10.
- **File B — Évènements** : T5 → T6 → T10, lancée le 21/11/2026 en même temps que T2. T10 ne fait la **fin de lot**
  que si T9 est déjà poussée (sinon elle écrit sa ligne et s'arrête ; T9 fera la fin de lot).
- **File C — T4 seule** (Timothée, 21/11/2026, « go ») : lancée en même temps que T2 ; T4 ne lance rien après elle.
  `FeteClient.tsx` est partagé avec T3 : T4 ne touche que l'en-tête (titre, retour, halo), T3 que l'ouverture de la
  feuille ; ajouts courts, `git pull --rebase` avant de coder, avant les tests finaux et avant de pousser.
- Fichiers partagés par les deux files : les locales (`fr.json`, `zh-CN.json`) seulement. Ajouts courts, aucun
  reformatage, `git pull --rebase` avant de coder, avant les tests finaux et avant de pousser.
- **Tests d'une tranche** (Timothée, même jour, « Go ») : les specs touchées et leurs voisines sur les **trois
  appareils** ; les cinq projets **seulement** pour les specs de `SPECS_GRAND_ECRAN` (agencement). Pas cinq projets
  pour tout.

Tests : Playwright, trois appareils toujours, cinq projets pour l'agencement ; données simulées
(`tests/helpers/fakeSession.ts`), noms inventés. Tester un chant FR et un ZH n'a pas lieu d'être ici (aucune page de
chant touchée) ; vérifier l'écran en 中文 à chaque tranche qui ajoute des libellés.

## Lancement

Go de Timothée pour tout le lot (17/11/2026, mot 6). **Lancement le 21/11/2026 à 12:01** (heure de Paris) : un message
programmé réveille la session `session_01UMdfuZmDFSArzAmTjkFyHN`, qui compte les chantiers (limite de cinq), puis lance
l'orchestratrice de T1 (`create_session`, `source_revision` et `outcome_branch` = `claude/corrections-design`, Opus,
consigne d'économie). Chaque tranche lance la suivante (dix tranches) ; la mise en ligne reste à Timothée, **après publication de `firestore.rules`** (T5a, T1, T8).

## Avancement

- 17/11/2026 — Planche publiée (deux versions), retours de Timothée intégrés, spec écrite, **go pour tout le lot**,
  lancement programmé le 21/11/2026 à 12:01.
- 17/11/2026 — Retours de Timothée après une discussion avec une responsable (mots 7) : AS14 à AS17 ajoutées, tranches
  portées à dix (fusion Grande salle = Scène en premier), rules à republier. Lancement inchangé.
- 21/11/2026, 12:01 — Codage lancé : orchestratrice de T1 `session_01UMdfuavwRF2qebrbLzJW5B` (un autre chantier de code en cours, lot AT : place libre).
- 21/11/2026 — **T1 faite** (session T1, `session_01UMdfuavwRF2qebrbLzJW5B`) : huit salles, la Scène retirée ;
  `salleLue` (`"scene"` → `"grande"`) sur toutes les lectures (occupations, chevauchement, Grille, Liste, feuille,
  rappels, lecteurs de réservations et d'évènements) ; `lieuxLies`, `avecGrande` et `Salle.dans` retirés ; créneaux de
  fête écrits et lus sur la Grande salle, fenêtres libres de la page de la fête calculées sur elle. Rules (1) et miroir
  `salleEcrivable` (`access.ts`) : `"scene"` refusée à la création, acceptée en modification seulement si le document
  l'avait déjà (réservations et évènements) ; champs de fête sans condition de salle. **⚠ `firestore.rules` à publier
  à la main par Timothée** (avec celles de T5a, avant toute mise en ligne). Décision déléguée (session T1, 21/11) :
  `/evenements/salles/scene` redirige vers `/evenements/salles/grande` (liens déjà envoyés). En attendant T2, la Grande
  salle se réserve en ordinaire pendant une saison de fête (la condition `salle === "scene"` de la feuille ne peut plus
  être vraie). Tests : tsc et lint verts ; douze specs Salles et Scène et quatre voisines sur les cinq projets, 2 118
  passés, 3 rouges en 27 min : deux en course (verts à la relance), et `coherence.spec.ts:225` (guillemets de
  `fr.json` l. 1238 et 4691, fichier non touché par T1 : antérieur). Après la relecture, `fromFsReservation` passe par
  `salleLue` ; relance de `salles-modele`, `salles-scene`, `salles-reserver` sur trois appareils : 130 passés, 2 ignorés, en 2 min. À
  revoir en T2 : libellés `fr.json` l. 1940 (« la Grande salle ou la Scène ») et `salles.sceneSaison`.
- 21/11/2026 — **Deux files** (Timothée, « Go ») : file A (T2 → T3 → T4 → T7 → T8 → T9) et file B (T5 → T6 → T10),
  voir § Tranches ; tests sur trois appareils, cinq projets pour les seules specs d'agencement. Orchestratrice de T5 lancée.
- 21/11/2026 — **File C** (Timothée, « go ») : T4 lancée seule en parallèle ; la file A devient T2 → T3 → T7 → T8 → T9.
- 21/11/2026 — **T5 faite** (file B, session T5) : `feteEnVue` (J − 2 mois calendaires → soir du jour J, brouillon
  exclu), `fetesPassees` (moins de 92 jours) et `dateFermeture` (`src/lib/scene/fetes.ts`) ; `agendaPublic` mêle les
  fêtes passées aux Passés (source `fete`) ; `CarteFete.tsx` neuf (carte en aplat `PLANNING_COLORS.scene` en tête de
  l'agenda, dans les trois dispositions ; `LigneFetePassee`, pavé bleu plein) ; connecté seulement (aucune lecture des
  programmes sans compte). En grand, avec la carte, « Aucun évènement à venir » reste dans la liste sous elle et le
  volet de droite est vide (critique-design). Décisions déléguées (session T5, 21/11) : (1) libellés de la carte en
  « Grande salle » (AS14 : « Réserver la Grande salle » / « 预约大厅 », états idem) ; (2) « Réserver la Grande salle »
  mène à `/evenements/scene/<fete>?reserver=1` : **à faire en file A (T3 ou fin de lot)** : la page de la fête ouvre la
  feuille unique, « Oui » d'avance, quand elle lit `?reserver=1` (aujourd'hui ce lien ouvre la page seule) ; (3) la fête
  passée n'est montrée qu'aux connectés, comme la carte. Tests : `tests/evenements-fete.spec.ts` neuve (14 tests, dans
  `SPECS_GRAND_ECRAN`) ; avec `evenements`, `evenements-2027`, `pages-en-grand-evenements` : 613 passés, 1 rouge en
  course (`evenements.spec.ts:1032`, tablette, vert seul), en 10 min 40 ; après la critique, `evenements-fete` et
  `pages-en-grand-evenements:405` sur leurs projets : 75 passés en 1 min. À laisser jusqu'à T6 : à la tablette portrait la
  carte seule prend toute la largeur (AS12 la mettra côte à côte avec l'épinglé ; sinon `md:max-w-xl`). Polices
  chinoises régénérées : inchangées (caractères déjà présents).
- 21/11/2026 — **T2 faite** (session T2, file A) : la Grande salle se réserve toujours depuis la feuille de Salles
  (`salles.sceneSaison` et la condition `!fete` de `pret` retirés) ; `saisonFeteDu` (`occupations.ts`, RS1) remplace
  `saisonSceneDu` et rend aussi une fête fermée (`ouverte: false`) ; question « C'est pour Noël 2026 ? » sous la
  Grande salle (Oui / Non, aucune réponse d'avance, bouton « Dis si c'est pour Noël » en attendant) ; Oui : pastilles
  des groupes permis (+ « Autre… » si permis), cinq « Pour quoi », note, écrit `salle: "grande"`, `fete`, `qui`,
  `pour`, `note`, `libre` hors plages, après `canReserverPour` ; Non : réservation ordinaire ; fête fermée : ligne AS5.
  `Pastille` (CreneauForm) et `pourDe` (programmes) exportés pour T3 ; `nomFete` dans `scene/fetes.ts`. Aucune rule
  changée. Décisions déléguées (session T2, 21/11) : (1) la ligne « réservé à … » (AS5, `feteNonPermis`) est codée
  mais ne paraît jamais : `canReserverPour(…, [])` ne refuse qu'une fête fermée ou en brouillon (« Qui peut réserver »
  restreint les groupes, pas les personnes) ; (2) modifier une réservation (ordinaire ou de fête) ne pose pas la
  question (AS7 : « pour la fête » ne se change pas) ; une réservation de fête modifiée garde `fete` et ses champs.
  Pour T3 (relecture) : modifier une réservation de fête ramenée dans une plage ne remet pas `libre` à faux ; des `qui`
  cochés puis une date dans la saison d'une autre fête font échouer l'envoi sans message propre. Tests : tsc, lint ;
  `salles-scene` (bloc T2 réécrit, cas a à i, 中文), `salles-reserver`, `salles-modele`, `scene-saison`, `coherence`,
  `libelles-langues`, `chants-fetes`, `back-office-coupe` sur trois appareils : 820 passés, 3 rouges connus
  (`coherence.spec.ts:225`, antérieur), en 9 min 20 ; après correction, cas a et i : 6 passés en 23 s. Écran regardé
  au téléphone, à la tablette et à l'ordinateur.
- 21/11/2026 — **T6 faite** (file B, session T6) : `epinglesEnGrand` (`agenda.ts`, RS7) ; `CarteEpingle.tsx` neuf (aplat
  encre sans image, I1 avec image : 16:9 en tête, filet `ring-border` ; date ou « du … au … », heure, lieu, « dans N
  jours » ; « Je m'inscris » si lien externe ou inscriptions ouvertes et pas déjà inscrit, sinon « Voir » ; anneau sur la
  carte dont la fiche est ouverte en grand). Trois épinglés en grand sous la fête, les suivants en petites lignes « À la
  une », aucun répété dans son mois. AS12 : empilées au téléphone et dans le volet ; côte à côte en tablette portrait
  (grille si deux cartes, rangée qui défile à 44 % au-delà) ; deux épinglés ou plus en rangée qui défile jusqu'au bord
  (`role="region"`, « Évènements épinglés » / « 置顶活动 »). Case « Épinglée » pour tout évènement (pas les réunions).
  **Rules : rien à publier pour T6** (`epingle` n'est filtré par aucun `hasOnly`). Décision déléguée (session T6, 21/11) :
  « Visible jusqu'au » reste réservé aux infos (pour un daté il le retirerait de tout l'agenda) ; un `expiresAt` présent
  est respecté. Hors périmètre, corrigé : espaces fines des guillemets de deux libellés de `fr.json` (`coherence.spec`
  rouge depuis le 16/11). Laissé : l'émoji 📌 des petites lignes (`EvenementCard.tsx:243`, antérieur). Tests :
  `evenements-epingle` neuve (dans `SPECS_GRAND_ECRAN`) avec `evenements`, `evenements-fete`, `evenements-2027`,
  `pages-en-grand-evenements` : 669 passés en 11 min 30 ; après la critique, `evenements-epingle`, `evenements-fete`,
  `pages-en-grand-evenements:405` : 130 passés en 1 min 50. Polices : aucun caractère chinois nouveau.
