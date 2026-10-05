# Spec : lot U6 — Back-Office (sélecteur, menu, Admin fusionnée, tableau de bord, réunions)

Spec écrite le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.

Lot U6 de `feuille-de-route.md` § 3.U (entretien des 03 et 04/10/2026, planche validée, version 10). Lots voisins :
cadre **U4** (`spec-navigation-grand-ecran.md`), statistiques **U7** (`spec-statistiques.md`), calendrier **U8**
(`spec-calendrier.md`), scène **U1** (`spec-scene-saison.md`), planning 2027 **U2** (`spec-planning-2027.md`), petit
déj **U3** (`spec-petit-dej.md`), éditeur **U5 bis** (`spec-editeur-setlist.md`), évènements 2027 **U9**
(`spec-evenements-2027.md`).

## Mots de Timothée

> « Toute la partie back-office dans un nouvel onglet/nouvelle partie du site. Avec un dashboard, calendrier etc…
> Pour avoir une vue globale de ce qui se passe et de ce qu'il y a à faire. Faire en sorte que le Dashboard soit
> personnalisable, avec des widgets et tout. » (03/10/2026, `feuille-de-route.md` § 3.U)

> « je veux faire une super app qui permet aux responsables de faire tout leur back office dessus […] » (20/09/2026)

Réponses au grill du 03/10/2026, mot pour mot : « Le menu complet comme ça ça fait pas trop long ? » (d'où les
8 entrées) ; « il faudrait pouvoir mettre un endroit pour qu'on mette un lien google doc pour qu'on puisse mettre
le récap de la réunion. Mais aussi une section sujet de réunion » ; « les sujets non traités seront affiché en
rouge. et quand ils créeront une nouvelle réunion, on leur demande s'ils veulent reprendre les sujets non
traités, s'ils valident ils sont importés dans la nouvelle réunion. Sinon ils restent en rouge dans l'ancienne
réunion » ; le compte rendu, par « Toutes les personnes de la réunion et les admins ».

## Ce que le code montre (04/10/2026)

- **Admin** (`src/app/admin/page.tsx`, admins seuls, l. 255-266 ; « Membres » par défaut, l. 180) : Réception =
  signalements (l. 475) et propositions de chants (l. 621) ; Inscriptions = création de comptes (l. 761) ; Membres
  = fiche, pôles en lecture, droits Équipes, plannings, évènements, notifications (l. 794-1075) ; Planning = import
  du Sheet (l. 1078), noms sans compte (l. 1106) ; Équipes = import de l'organigramme (l. 1137) ; Questionnaire (l. 1205).
- **Notifier** (`src/app/notifier/page.tsx`) : admins et droits `notify` ; modes notification et « Publier » un
  trimestre (l. 50, 210). Sa destination « Annonces » (l. 22) mène à `/annonces`, en 404 en ligne.
- **Entrées** : barre du bas Chants · Setlists · Planning · Évènements · Moi, « Moi » couvrant `/taches`,
  `/notifier`, `/admin` (`MobileTabBar.tsx:18-24`) ; Tâches, Équipes, Notifier, Administration dans la barre du
  haut (`Navbar.tsx:236-241, 340-344, 356-365`) et dans Moi (`moi/page.tsx:61, 65-69, 79-84`).
- **Droits du profil** (`types/user.ts:51-71`) : `serviceRoles`, `annonces`, `notify`, `equipes` (booléen),
  `poles` (da, media, orga, evenement), `plannings`. **`polesDe` donne le pôle Louange à quiconque a un rôle de
  service** (`access.ts:44-50`). Les équipes Louange, EDD, Régie, Traduction, Développement ne donnent aucun pôle
  (`equipes/organigramme.ts:24-38`) ; le référent est un booléen par membre d'équipe (`types/equipe.ts:15`).
- **Profil verrouillé** : `users/{uid}` ne se modifie que par un admin (`firestore.rules:91`) ; chacun écrit ses
  réglages dans un document à lui (`notifPrefs/{uid}` l. 356-359, `onboarding/{uid}` l. 365-367) ; les équipes
  n'écrivent dans le profil que par `recalculerPoles` (`equipes/serveur.ts:33-50`, Admin SDK).
- **Réunion** = évènement `pour: "pole:<pôle>"` (`types/evenement.ts:12`) : vue par les membres du pôle,
  l'organisateur, les admins (`access.ts:120-132`) ; créée par un membre du pôle (`firestore.rules:180-186`),
  modifiée par l'organisateur et la coordination (l. 187-190) ; sans inscription (`EvenementForm.tsx:73-74`) ;
  dupliquée par `?from=`, sans les dates (`EvenementClient.tsx:85`) ; ni sujets ni compte rendu.
- **Rappel du matin** (`api/cron/reminders/route.ts`) : tâches et ouvertures fondues dans la notification de
  service (l. 236, `avecLignes`) ; mais **la veille d'un évènement, réunions comprises, part à part** (l. 291-318).
- **Divers** : `BACK_OFFICE` (`lib/backOffice.ts:5`) met les pages en 404 (`taches/layout.tsx:7`), patron de
  redirection `annonces/page.tsx`, adresses de `back-office-coupe.spec.ts:56` ; `@dnd-kit` sans capteur clavier
  (`lib/dnd/sensors.ts:4-12`) ; la grille du planning écrit pour qui a le droit (`access.ts:185-192`) et exporte
  pour tous (`PlanningGrille.tsx:357-374`) ; colonnes `optionnelle` (`planning/grilles.ts:28`) ; « Ce dimanche »
  (`planning/page.tsx:165`) ; setlist publiée = ni brouillon ni privée (`firebase/setlists.ts:154`).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 03/10 | Partie **« Back-Office »**, visible de **tout responsable** (au moins un droit) ; chacun n'y voit que **ses modules**. **Plus de section Admin** : tout son contenu y passe. |
| 03/10 | Back-Office : Tâches, Équipes / organigramme, Planning en grille (écriture, import, export), Évènements côté gestion et scène, Notifier, Administration, tableau de bord, calendrier, statistiques. **App** : Chants, Setlists (création comprise), Planning en lecture, Mes services, Harmonie, Moi, agenda public des évènements et inscription. |
| 03/10 | **Sélecteur « App ↔ Back-Office »** réservé aux responsables : en haut de la barre latérale en grand, en haut de l'écran sur téléphone et tablette portrait. |
| 03/10 | **Menu à 8 entrées** : Tableau de bord, Calendrier, Planning (+ import, sans compte), Tâches, Évènements (+ scène), Équipes (+ personnes, droits, inscriptions), Messages (réception, notifier, questionnaire), Statistiques. |
| 03/10 | **Tableau de bord** : disposition par personne, enregistrée sur le compte, **la même sur téléphone et ordinateur** ; défaut selon le rôle (louange 1, 2, 4, 5 ; évènement 1, 2, 3, 8 ; admin tout) ; ajouter, retirer, réordonner (**glisser et boutons**), tailles, réglages par widget ; 10 widgets ; **widget Calendrier** S (prochains jours), M (semaine), L (mois), sources réglables. |
| 03/10 | Barre du bas du Back-Office (téléphone, tablette portrait) : Accueil · Calendrier · Tâches · Planning · Plus, **personnalisable** (4 onglets + « Plus », enregistrés sur le compte) ; la barre de l'App reste fixe ; tablette portrait = téléphone en plus grand, Back-Office en grille de 2. |
| 03/10 | **Réunions** des pôles **et des équipes de l'organigramme** : « Sujets à aborder » (tout membre en ajoute jusqu'au début ; l'auteur, l'organisateur et les admins en retirent ; l'organisateur ordonne et coche « traité ») ; non traités **en rouge** ; à la création d'une nouvelle réunion, proposition de **les reprendre** (oui : importés ; non : restent en rouge) ; **lien Google Doc du compte rendu** collé par toute personne de la réunion ou un admin, membres prévenus par une ligne du rappel du matin ; rappel la veille dans le rappel du matin. |
| 03/10 | Statistiques des chants : **admins seulement**. |
| 04/10 | Écrans réunions validés ; tablette paysage = barre latérale **toujours réduite**. |
| 04/10 | Tout part en ligne ensemble à la fin du chantier (retrait de `BACK_OFFICE`, fusion sur `main`). |
| 20/09 | Une seule notification par personne et par jour : tout rappel se fond dans le rappel du matin. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Responsable** = admin, ou au moins un de : `poles` non vide (écrit par l'organigramme), `plannings`, `notify`, `annonces` non vides, `equipes` vrai, référent d'une équipe (`referentDe`, Q8). **Le pôle Louange implicite ne compte pas.** | `polesDe` ferait de tout musicien ou choriste un responsable (`access.ts:44-50`) : l'option « toute l'équipe de louange », écartée au tour 1. |
| Q2-Q4 | **Ses modules, Admin fusionnée, adresses** : les trois tables ci-dessous. Adresses `/back-office/…` ; les anciennes deviennent des redirections (patron `annonces/page.tsx`, 404 coupé). | L'espace se lit dans l'adresse ; une fiche (évènement, planning) existe des deux côtés avec d'autres boutons ; un lien de notification déjà envoyé reste juste. |
| Q5 | **Stockage** : document `backOffice/{uid}`, écrit par l'intéressé seul ; disposition absente = défaut du rôle, recalculé. | `users/{uid}` verrouillé (`firestore.rules:91`) ; patron `onboarding/{uid}`. |
| Q6 | **Sélecteur** : le même pour tous les responsables, même avec un seul module (le tableau de bord est toujours là). Il rouvre la dernière page de chaque espace (mémoire de session) ; sinon le tableau de bord, ou `/planning` côté App (cible du logo, `Navbar.tsx:145`). Places : U4 (Q14, place vide sous le label). | Pas de cas particulier ; la « vue globale » vaut pour tous. |
| Q7 | **Sujets** : sous-collection `evenements/{id}/sujets/{sid}`, un document par sujet ; droits en double ; borne « jusqu'au début » vérifiée dans le navigateur. | Un tableau se réécrit en entier (deux ajouts simultanés s'effacent, cf. `spec-petit-dej.md`) ; les règles ne lisent pas une heure de Paris en texte (choix de confiance, CLAUDE.md). |
| Q8 | **Réunion d'équipe** : `pour: "equipe:<id>"`, créée par un **référent** de l'équipe ou un admin ; `dansEquipes` et `referentDe` recopiés sur le profil par `recalculerPoles`, comme `poles`. | Patron D9 de `spec-organigramme.md` : les règles lisent le profil, pas les 13 équipes. |
| Q9 | **Rouge** = la réunion a commencé (`aCommence`, `evenements/agenda.ts:22-25`) et le sujet n'est ni traité ni repris. | La même frontière que l'ajout, testable à l'horloge simulée. |
| Q10 | **Tailles** : grille de 4 (ordinateur, tablette paysage) : S = 1, M = 2, L = 4 colonnes ; grille de 2 (tablette portrait) : S et M = 1, L = 2 ; téléphone : une colonne. Seul le Calendrier change de contenu avec sa taille. | Planche : `.w-s/.w-m/.w-l` sur 4 colonnes. |
| Q11 | **Défaut** : admin = tout ; « évènement » (coordination ou `annonces`) = 1, 2, 3, 8 ; « louange » (rôle de service ou `plannings`) = 1, 2, 4, 5 ; les deux = l'union ; sinon 1, 2 ; toujours filtré par les droits du widget. Ordre et tailles de la planche. | Une règle pure, testée. |
| Q12 | Personnalisation **enregistrée à chaque geste** ; « Disposition par défaut » demande confirmation. | Patron de l'éditeur à enregistrement automatique. |
| Q13 | **Barre du bas** : exactement 4 entrées (toutes s'il y en a moins), « Plus » toujours à droite ; défaut Accueil · Calendrier · Tâches · Planning, complété dans l'ordre du menu si une entrée manque. | U4 Q14 : même liste que la barre latérale ; une entrée sans droit n'y figure pas. |
| Q14 | **Côté App** : la fiche d'un évènement garde s'inscrire, sujets, compte rendu ; Modifier, Dupliquer, Supprimer passent au Back-Office (lien « Gérer dans le Back-Office »). Le planning de l'App passe en lecture, ni saisie ni export ; l'onglet Table y montre la carte compacte « Prépa. Table du Seigneur » (planche `petit-dej-telephone`, U3 question 8). La carte « Petit déj » de U3 reste dans l'App, avec « Je m'inscris » pour tous et, pour les écrivains de la Table et les admins, ＋, ✎ et « Retirer » : un seul endroit pour les lignes (réponse à la question 1 de U3). Dans le Back-Office, la grille s'ouvre directement en modification pour qui peut la remplir (cases « Choisir » de `bo-planning-2027` ; réponse à la question 5 de U2). | Décision « gestion = Back-Office » (`EvenementClient.tsx:68-85`) ; la grille démarre aujourd'hui en lecture (`PlanningGrille.tsx:58, 343-352`). |
| Q15 | **Pastilles** : Tâches = à faire pour moi (compte de « Mes tâches », `moi/page.tsx:49-51`) ; Messages = signalements et propositions en attente (`admin/page.tsx:417`). | Comptes déjà calculés. |
| Q16 | **Langue** : sélecteur, menu, tableau de bord, barre, réunions en FR et 中文 ; anciens blocs d'administration en français. | Q22 du lot 8 ; des équipes et groupes sinophones tiennent des réunions. |
| Q17 | **Lots à venir** : les entrées Statistiques (U7, S2) et Calendrier (U8) et leurs widgets arrivent avec leur lot ; U6 leur garde leur rang (menu, barre par défaut, catalogue). En attendant, la barre par défaut prend l'entrée suivante. | Aucune page vide ; U7 prévoit déjà l'entrée, U8 la page « à l'adresse fixée par U6 ». |
| Q18 | **Rappels** : veille d'une réunion et compte rendu = lignes du rappel du matin, préférence « Évènements » (celle des réunions, `route.ts:306`). | Règle du 20/09 ; `avecLignes` existe ; U8 fait de même pour « Prévenir les inscrits ». |

### Q2 — Droits → entrées

| Entrée | Visible si | Sous-parties |
| --- | --- | --- |
| Tableau de bord | tout responsable | — |
| Calendrier (U8) | tout responsable | sources selon les droits (U8 Q2) |
| Planning | admin, `plannings` non vide, ou droit de publier (`canPublishPlanning`) | Plannings (ceux qu'on remplit ou publie) · Import et Sans compte : admins |
| Tâches | admin, ou un pôle (`polesDe`, Louange compris) | ses pôles |
| Évènements | admin, coordination, `annonces`, un pôle (`polesDe`), `referentDe` | Évènements (ceux qu'on gère) · Réunions (ses pôles et équipes) · Scène : coordination (U1) |
| Équipes | admin, droit `equipes` | Organigramme (édition) · Personnes, Inscriptions, Import : admins |
| Messages | admin, `notify` non vide | Réception, Questionnaire : admins · Notifier : `notify` |
| Statistiques (U7) | admins (`canVoirStatistiques`) | — |

### Q3 — Admin → Back-Office

| Bloc d'aujourd'hui | Devient | Qui |
| --- | --- | --- |
| Réception : signalements, propositions de chants (`admin/page.tsx:475`, 621) | Messages › Réception | admins |
| Membres : liste, fiche, pôles, droits (l. 794-1075) | Équipes › Personnes | admins |
| Inscriptions : création de comptes (l. 761) | Équipes › Inscriptions | admins |
| Import du planning depuis le Sheet (l. 1078) et « Reprendre les noms du petit déj » (U3) | Planning › Import | admins |
| Noms du planning sans compte (l. 1106) | Planning › Sans compte (et widget Comptes) | admins |
| Import de l'organigramme et son compte rendu (l. 1137) | Équipes › Import | admins |
| Résultats du questionnaire (l. 1205) | Messages › Questionnaire | admins |
| `/notifier`, notification | Messages › Notifier | `notify`, admins |
| `/notifier`, « Publier » (l. 50, 210) | Planning, bouton « Publier le T… » (U2) | publieurs |
| `/equipes`, édition d'une équipe | Équipes › Organigramme | droit `equipes`, admins |

### Q4 — Adresses

| Adresse | Contenu | Ancienne adresse redirigée |
| --- | --- | --- |
| `/back-office` | Tableau de bord | `/admin` |
| `/back-office/calendrier` | Calendrier (U8) | — |
| `/back-office/planning/…` | Plannings (U2), `…/import`, `…/sans-compte` | — |
| `/back-office/taches`, `…/taches/<pôle>` | Tâches | `/taches/<pôle>` |
| `/back-office/evenements`, `…/reunions`, `…/nouveau`, `…/<id>`, `…/<id>/modifier` | Évènements | `/evenements/nouveau`, `/evenements/<id>/modifier` |
| `/back-office/evenements/scene` | écran de la coordination, passé tel quel (U1 Q12) | — |
| `/back-office/equipes`, `…/personnes`, `…/inscriptions`, `…/import` | Équipes | — |
| `/back-office/messages`, `…/notifier`, `…/questionnaire` | Messages | `/notifier` |
| `/back-office/statistiques` | Statistiques (U7) | — |

Restent dans l'App : `/taches` (« Mes tâches », question 3), `/equipes` (lecture, question 4), `/evenements` et
`/evenements/<id>` (agenda, fiche, inscription, sujets), `/evenements/scene` (les groupes réservent, U1), `/planning/*`.

## Objectif

1. Un responsable bascule de l'App au Back-Office par un sélecteur ; l'assemblée ne voit rien de plus.
2. Le Back-Office a 8 entrées, chacune selon les droits ; l'Admin et Notifier y sont rangés bloc par bloc.
3. Un tableau de bord à widgets, disposé par chacun sur son compte ; une barre du bas à la carte (téléphone, tablette).
4. Les réunions de pôle et d'équipe ont leurs sujets, le report des non traités et le lien du compte rendu ; leurs
   rappels tiennent dans le rappel du matin.

## Réussite

1. Un choriste sans autre droit ne voit aucun sélecteur ; `/back-office` lui répond « Réservé aux responsables ».
2. Alice (pôle Événement) touche « Back-Office » sur son téléphone : Ce dimanche, À faire, Prochains évènements,
   Scène ; barre Accueil · Tâches · Évènements · Plus (pas de Planning ; Calendrier avec U8). Elle ajoute Petit déj,
   monte Scène en tête, passe Prochains évènements en L ; sur l'ordinateur, même disposition.
3. Un admin trouve signalements (Messages › Réception), fiche et droits d'un membre (Équipes › Personnes), import
   du Sheet (Planning › Import) ; `/admin` mène au tableau de bord ; sa barre choisie sur téléphone le suit sur tablette.
4. Un membre du pôle DA ajoute un sujet la veille ; à 20:00 le jour J, le champ disparaît ; l'organisatrice coche
   3 sujets sur 4, le quatrième passe en rouge. En créant la réunion suivante : « Reprendre les sujets non
   traités ? » → « Oui, les reprendre » : le sujet y est, et n'est plus rouge dans l'ancienne. Un membre colle le
   lien du compte rendu ; le lendemain, les autres membres ont **une ligne de plus** dans le rappel du matin, **pas
   une notification de plus** ; la veille de la réunion suivante, la ligne « Réunion DA demain, 20:00 : 1 sujet ».
5. Interrupteur coupé : aucune adresse `/back-office/…` ne répond, aucun sélecteur n'apparaît.

## Modèle

```ts
// src/types/backOffice.ts (nouveau) — document backOffice/{uid}, écrit par l'intéressé seul
export const ENTREES = ["tableau", "calendrier", "planning", "taches", "evenements", "equipes", "messages", "statistiques"] as const;
export const WIDGETS = ["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "scene", "comptes", "raccourcis"] as const;
export type Entree = (typeof ENTREES)[number];
export type WidgetId = (typeof WIDGETS)[number];
export type Taille = "s" | "m" | "l";
export type Reglages = Partial<{ services: string[]; poles: string[]; plannings: string[]; section: string; nombre: number;
  horizon: number; periode: "3m" | "6m" | "12m" | "tout"; programme: string; liste: "sansCompte" | "nouveaux";
  raccourcis: string[]; sources: string[]; seulementMoi: boolean }>;   // clé absente = défaut de la table
export interface Widget { id: WidgetId; taille: Taille; reglages: Reglages }
export interface PreferencesBackOffice {
  tableauDeBord?: Widget[];  // absent = défaut du rôle (Q11), jamais recopié
  barreDuBas?: Entree[];     // 4 au plus, dans l'ordre ; absent = défaut (Q13)
  majLe: string;             // ISO
}
// src/types/evenement.ts : EvenementPour gagne `equipe:${string}` ;
//   Evenement.compteRendu?: { url: string; parUid: string; parNom: string; le: string } | null
// src/types/reunion.ts (nouveau) — evenements/{id}/sujets/{sid}
export interface Sujet {
  id: string; texte: string; auteurUid: string; auteurNom: string; creeLe: string;
  ordre: number; traite: boolean;                  // ordre choisi par l'organisateur ; un ajout va à la fin
  reprisDans: string | null;                       // id de la réunion qui l'a repris
  repriseDe: { reunionId: string; date: string } | null;
}
// src/types/user.ts, écrits par le serveur seul avec `poles` : dansEquipes?: string[]; referentDe?: string[]
```

Un sujet repris est recopié dans la nouvelle réunion par qui la crée (`auteurUid` = lui, `auteurNom` d'origine,
`repriseDe` rempli) ; l'original reçoit `reprisDans`. Purs, dans `access.ts` : `estResponsable`, `entreesBackOffice`,
`widgetsPermis`, `estDeLaReunion`, `peutAjouterSujet` (personne de la réunion, pas commencée), `peutRetirerSujet`
(auteur, organisateur, admin), `peutOrdonnerSujets` (organisateur, admin) ; `canSeeEvenement`, `canCreateEvenement`,
`creatableEvenementPours`, `destinatairesEvenement` apprennent `equipe:`. `entreesBackOffice` remplit l'espace
« back-office » de `entreesBarre` (U4) ; défauts dans `src/lib/tableauDeBord/`, cases vides dans
`src/lib/planning/casesVides.ts` (repris par U8), sujets et lignes du rappel dans `src/lib/reunions/`.

### Widgets

| # | Widget | Taille | Réglages (défaut) | Qui l'ajoute | Source, lot |
| --- | --- | --- | --- | --- | --- |
| 1 | Ce dimanche | M | services (ceux où l'on sert, sinon Culte Franco) | tout responsable | lignes de « Ce dimanche » + setlist publiée, présentation, cases vides ; U6 |
| 2 | À faire | M | pôles (tous les siens) | Tâches visible | tâches ; U6 |
| 3 | Prochains évènements | M | nombre 3 / 5 / 10 (3), section (toutes) | Évènements visible | évènements de l'app ; règle d'`agendaPublic` avec U9 (Sheet jusqu'au 31/12/2026, U9 Q6) |
| 4 | Cases vides du planning | S | plannings (ceux qu'on remplit ; Culte pour un admin), 2 / 4 / 8 dimanches (4) | Planning visible | `casesVides` sur `lignesDeLAnnee` (U2) : colonne non `optionnelle` vide ; U6 |
| 5 | Setlists à préparer | S | services (les siens), 2 / 4 semaines (4) | peut créer une setlist | `prochainsServicesSansSetlist` (U5 bis) |
| 6 | Petit déj | S | 4 / 8 dimanches (4) | tout responsable | `lirePetitDej`, `estLibre` (U3) |
| 7 | Chants les plus joués | M | période 3 / 6 / 12 mois / depuis le début (12) | admins | `statsChants`, construit par U7 (S5) |
| 8 | Scène | S | programme (celui qui est affiché) | tout responsable | créneaux ; saison de U1 |
| 9 | Comptes | S | sans compte / nouveaux comptes (sans compte) | admins | noms sans compte (`admin/page.tsx:240-245`), comptes récents ; U6 |
| 10 | Raccourcis | S | Tâche, Évènement, Notifier, Setlist (ceux permis) | tout responsable | liens ; « Setlist » ouvre « Pour quel service ? » ; U6 |
| 11 | Calendrier | M | sources (toutes), « Seulement moi » (non) | tout responsable | construit par U8 (C8), réglages enregistrés ici (U8 Q11) |

### Règles proposées (`firestore.rules`, à publier à la main ; miroir dans `access.ts`)

```
function reunion(id) { return get(/databases/$(database)/documents/evenements/$(id)).data; }
function organise(id) { return isAdmin() || reunion(id).organisateurUid == request.auth.uid; }
function changeSeulement(champs) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(champs); }
function estDeLaReunion(e) {   // membre du pôle ou de l'équipe, organisateur, admin
  return isAdmin() || e.organisateurUid == request.auth.uid
    || (e.pour.matches('pole:[a-z]+') && isTachePole(e.pour.split(':')[1]))
    || (e.pour.matches('equipe:[a-z0-9-]+') && hasProfile() && e.pour.split(':')[1] in profile().get('dansEquipes', []));
}
match /evenements/{id} {
  // create, en plus : || (pour.matches('equipe:…') && (isAdmin() || pour.split(':')[1] in profile().get('referentDe', [])))
  // update, en plus : || (estDeLaReunion(resource.data) && changeSeulement(['compteRendu']))
  match /sujets/{sid} {
    allow read: if signedIn() && estDeLaReunion(reunion(id));
    allow create: if signedIn() && estDeLaReunion(reunion(id)) && request.resource.data.auteurUid == request.auth.uid
      && request.resource.data.traite == false && request.resource.data.reprisDans == null;
    allow update: if signedIn() && ((organise(id) && changeSeulement(['ordre', 'traite']))
      || (estDeLaReunion(reunion(id)) && resource.data.reprisDans == null && changeSeulement(['reprisDans'])));
    allow delete: if signedIn() && (organise(id) || resource.data.auteurUid == request.auth.uid);
  }
}
match /backOffice/{uid} { allow read, write: if signedIn() && request.auth.uid == uid; }
// users/{uid} create : dansEquipes == [] et referentDe == [] rejoignent les champs interdits.
```

`estResponsable` et le menu règlent l'affichage, ils ne protègent aucune donnée : chaque sous-partie garde sa
règle (signalements, profils, `config/app` : admins ; plannings : `plannings` ; etc.).

## Écrans

**Téléphone** (`bo-telephone-accueil`, `bo-telephone-plus`, `bo-telephone-barre-perso`, `bo-reunion-apres-telephone`,
`bo-reunion-nouvelle-telephone`) :
- En-tête d'un responsable : logo, sélecteur « App · Back-Office » (deux liens, l'espace courant marqué), cloche ;
  la planche met le sélecteur à la place du label contextuel, gelé (question 5). Sans droit : en-tête inchangé.
- Barre du bas du Back-Office : 4 onglets + « Plus », courant en pastille d'encre (celle de l'App ne change pas).
  Tableau de bord : titre, date, « Personnaliser » ; une colonne.
- « Plus » : une carte par entrée hors barre (icône, nom, contenu **selon les droits**, pastille), « Personnaliser
  la barre » (**absent de la planche**, question 9), « Revenir à l'app ». « Ta barre du bas » (feuille) : entrées
  permises à cocher (4 au plus), poignées, aperçu, « Remettre la barre par défaut », « Terminé ».
- Réunion : compte rendu en tête (« Ouvrir »), « Sujets · 3 traités sur 4 », non traités en rouge ; nouvelle
  réunion : « Reprendre les sujets non traités ? », « Non, les laisser » / « Oui, les reprendre ».

**Tablette portrait** (`tablette-portrait-back-office`) : le téléphone en plus grand ; en-tête logo, label, sélecteur
(après le label, U4), cloche, langue ; grille de 2 (la planche y pose deux widgets M en pleine largeur : en L ici) ;
barre du bas centrée de 560 px. **Tablette paysage** : barre réduite (U4), sans sélecteur, on change d'espace en la
dépliant (U4 Q5 et questions 1-2 ; question 10) ; grille de 4 ; pas de barre du bas.

**Ordinateur** (`bo-tableau-de-bord` ; barre de `bo-calendrier`, `bo-statistiques`, `bo-scene-reservations` ;
`bo-reunion-avant`) :
- Barre latérale (U4) : logo, « Réduire », sélecteur dans la place réservée, entrées permises (icônes, pastilles),
  pied (compte, cloche, langue). Réduite : comme la tablette paysage.
- Tableau de bord : titre, « {jour} · bonjour {prénom} » ; « Personnaliser » devient « Terminé » (plein, encre) avec
  « Disposition par défaut » ; bandeau « Ajouter un widget » (puces des widgets permis non affichés, sinon « Tous
  les widgets sont déjà affichés. ») ; grille de 4 ; en personnalisation, contour pointillé et barre par widget :
  poignée, « Monter », « Descendre », S, M, L, « Réglages du widget », « Retirer le widget » ; réglages en pastilles.
- Réunion : « Réunion de pôle · DA » (ou « Réunion d'équipe · Régie »), titre, date, lieu, organisatrice ;
  « Modifier », « Dupliquer pour la prochaine » ; cartes « Sujets à aborder », « Compte rendu » (« Enregistrer le
  lien »), « Réunions précédentes » (« Compte rendu » ou « pas de compte rendu »).

**Absents de la planche**, décrits d'après leurs voisins : pages Planning, Tâches, Évènements, Équipes, Messages =
titre et sous-onglets en contrôle segmenté (comme « Les plus joués · Jamais joués · À redécouvrir »), contenu =
écrans d'aujourd'hui ; « Réservé aux responsables » (comme l'Admin) ; fiche de réunion côté App (sans Modifier ni
Dupliquer) ; sujet repris (gris, « repris le 7 novembre ») ; ligne d'annonce de U9 (Q7) en tête de Évènements.

## Ce qui sera construit

Tranches courtes, chacune vérifiable seule, tout derrière `BACK_OFFICE` ; un commit par lot, sur demande.

| Tranche | Contenu | Vérifié par |
| --- | --- | --- |
| B1 — Espace | `estResponsable`, `entreesBackOffice`, `widgetsPermis` ; `src/app/back-office/layout.tsx` (404 coupé, « Réservé aux responsables ») ; sélecteur dans les places de U4, mémoire de la dernière page ; menu filtré. | Un choriste ne voit rien de neuf ; un admin voit 6 entrées (8 avec U7 et U8). |
| B2 — Admin fusionnée | Planning (écriture avec les composants actuels, Import, Sans compte, Publier), Équipes (Organigramme, Personnes, Inscriptions, Import), Messages (Réception, Notifier, Questionnaire) ; `/admin`, `/notifier` redirigent ; Moi et la barre du haut perdent Notifier et Administration ; planning de l'App en lecture, carte compacte de la Table. | Chaque ligne de la table Q3, avec ses droits. |
| B3 — Tâches et Évènements | `/back-office/taches[/pôle]` ; `/taches` = « À faire pour moi » ; Évènements · Réunions · Scène (écran de U1), nouveau, fiche de gestion, modifier ; redirections ; « Gérer dans le Back-Office » sur la fiche de l'App. | Anciennes adresses, liens de la cloche, droits par rôle. |
| B4 — Tableau de bord | Widgets 1-6 et 8-10, défauts selon le rôle, grille selon la disposition, lecture de `backOffice/{uid}`. | Défaut de chaque rôle ; données de chaque widget sur jeu d'essai. |
| B5 — Personnaliser | Catalogue, retirer, Monter / Descendre, glisser, S / M / L, réglages, « Disposition par défaut » ; écriture à chaque geste ; règle `backOffice/{uid}`. | Relue sur un autre appareil, la disposition est la même. |
| B6 — Barre du bas | Barre du Back-Office (téléphone, tablette portrait), « Plus », feuille « Ta barre du bas ». | 4 entrées, ordre, défaut, droit manquant, barre de l'App inchangée. |
| R1 — Sujets | Sous-collection, règles, carte « Sujets à aborder » (App et Back-Office) : ajout jusqu'au début, retrait, ordre (glisser, et clavier par le capteur clavier de `@dnd-kit`), « traité », rouge. | Droits de chacun ; borne du début à l'horloge simulée. |
| R2 — Reprise | Question à la création et à « Dupliquer pour la prochaine », `reprisDans` / `repriseDe`, « Réunions précédentes ». | Oui : importés, plus rouges ; non : reproposés la fois suivante. |
| R3 — Compte rendu et rappels | `compteRendu`, sa règle, la carte (coller, ouvrir, retirer) ; cron : veille de réunion et compte rendu en lignes du rappel du matin, la veille ne part plus à part. | Une seule notification par personne et par jour, FR et 中文. |
| R4 — Réunions d'équipe | `equipe:<id>` ; `dansEquipes`, `referentDe` par `recalculerPoles` ; bouton admin « Recalculer depuis l'organigramme » (Équipes › Import) pour les profils existants ; règles, visibilité, création, destinataires. | Un référent crée, un membre ajoute un sujet, un non-membre ne voit rien. |

Ensuite : U7 ajoute l'entrée Statistiques et le widget 7 ; U8 l'entrée Calendrier et son widget, sa pastille
« Réunions » prenant les réunions de pôle et d'équipe (`spec-calendrier.md`, § Modèle).

## Tests

Playwright, écrits avant le code et vus en échec, trois appareils ; B1, B4, B5 rejoignent le `testMatch` du projet
`tablette-paysage` de U4 (Q16). Firestore et routes simulés (`signInAs`, `page.route`) ; captures à l'œil, 4 dispositions.

- `tests/back-office-espace.spec.ts` : `estResponsable` (admin, pôle DA, `plannings`, `notify`, `annonces`,
  `equipes`, référent → oui ; choriste seul, membre d'équipe non référent → non) ; table des entrées ; sélecteur
  pour les responsables seuls ; « Réservé aux responsables » ; dernière page de chaque espace.
- `tests/back-office-admin.spec.ts` : chaque bloc de l'Admin à sa place, avec ses droits ; redirections (`/admin`,
  `/notifier`, `/taches/da`, `/evenements/nouveau?from=…`, `/evenements/<id>/modifier`) ; planning de l'App sans
  saisie ni export ; « Gérer dans le Back-Office » pour l'organisateur seul ; Moi sans Notifier ni Administration.
- `tests/tableau-de-bord.spec.ts` : défauts (louange, évènement, admin, DA seul) ; données des widgets ; ajouter,
  retirer, réordonner au glisser **et** aux boutons ; colonnes de S, M, L par disposition ; un réglage change le
  contenu ; `backOffice/{uid}` écrit puis relu dans un second contexte ; « Disposition par défaut » ; widget non
  permis absent du catalogue.
- `tests/barre-back-office.spec.ts` (téléphone, tablette) : défaut, repli si un droit manque, « Plus », feuille
  (4 au plus, ordre, aperçu, défaut), enregistrement ; barre de l'App inchangée.
- `tests/reunions.spec.ts` : ajout jusqu'au début (horloge simulée) ; retrait par l'auteur, l'organisateur, un
  admin, refusé à un autre membre ; ordre et « traité » ; rouge ; reprise oui / non ; compte rendu ; réunion
  d'équipe (référent, membre, non-membre) ; pur : lignes du rappel FR et 中文, un seul message quand service,
  tâche et réunion tombent le même jour.
- `tests/back-office-coupe.spec.ts` (étendu) : `/back-office/…` en 404, aucun sélecteur, anciennes adresses en 404.

Tests touchés : `equipes.spec.ts` (l. 358), `evenements.spec.ts` (nouveau, modifier, l. 554),
`planning-import.spec.ts` (l. 53), `taches.spec.ts`, `taches-evenements.spec.ts`, `nouveaux-membres.spec.ts`
(l. 174, 203), `look-secondaires.spec.ts` (l. 64), `coherence.spec.ts` (l. 82-90 ; l. 132 lit `admin/page.tsx` et
`notifier/page.tsx`, qui déménagent), `programme-scene.spec.ts`, `rappels-regroupes.spec.ts`, `planning-petit-dej.spec.ts`.

## Hors périmètre

- **Toujours** : droits en double (`access.ts` + `firestore.rules`) ; tout derrière `BACK_OFFICE` ; tests avant le
  code ; FR et 中文 hors anciens blocs d'administration ; rappels fondus dans le rappel du matin ; boutons pleins
  en encre (5C1) ; `graphify update .` après le code.
- **Demander avant** : une dépendance npm (aucune n'est nécessaire) ; un cron ; un widget hors des 11, une entrée
  hors des 8 ; une barre de l'App personnalisable ; une notification à part ; retoucher le cadre de U4 ou les
  contenus de U1, U2, U7, U8, U9 au-delà de ce qui est écrit ici.
- **Jamais** : un sélecteur pour un non-responsable ; écrire `users/{uid}` depuis le navigateur ; deux
  notifications le même jour pour des rappels ; retirer l'interrupteur dans ce lot ; toucher aux couleurs gelées.

## Questions ouvertes

1. **Référents** responsables, pour créer les réunions de leur équipe ? Reco : oui ; sinon les équipes sans pôle
   (Régie, Louange, EDD…) n'auraient de réunions que par un admin.
2. **Pôle Louange implicite** : il ne fait pas d'un musicien, choriste ou régie un responsable ? Reco : oui (tour 1).
3. **« Mes tâches »** reste dans Moi pour tout membre d'un pôle, Louange compris (voir et cocher), création et
   pages de pôle au Back-Office ? Reco : oui ; sinon un président ne cocherait plus « Envoyer la setlist » et le
   rappel du matin pointerait vers une page fermée (Q14 du lot 7 contre « Tâches » au Back-Office).
4. **Organigramme** : sa lecture reste dans Moi pour tout membre connecté (D5 de `spec-organigramme.md`, « c'est
   l'objet de la demande ») ; édition, personnes, import au Back-Office ? Reco : oui.
5. **Téléphone** : pour un responsable, le sélecteur prend la place du label contextuel, gelé, comme sur la planche
   validée (`bo-telephone-accueil`), et la langue passe par Moi ; le label reste pour tous les autres et sur
   tablette portrait ? Reco : oui ; à 390 px, label, sélecteur, cloche et langue ne tiennent pas ensemble.
6. **Catalogue de 11** (les 10 du tour 1 et le Calendrier) : l'admin « tout » les a tous, Scène et Comptes compris,
   que la planche n'affichait pas par défaut ? Reco : oui.
7. **Statistiques et Calendrier** arrivent avec U7 et U8, sans page d'attente dans U6 ? Reco : oui.
8. **Veille des autres évènements** (avec inscriptions) : la fondre aussi dans le rappel du matin, dans la même
   boucle (R3) ? Reco : oui, c'est la règle du 20/09.
9. **« Personnaliser la barre »** en ligne de « Plus », entrée absente de la planche ? Reco : oui.
10. **Barre réduite sans sélecteur** : on change d'espace en dépliant (U4, questions 1 et 2) ; si le dépliage de
    la tablette paysage est refusé, une icône ⇄ en tête de la barre réduite ? Reco : oui.
11. **Sujets laissés** reproposés à chaque nouvelle réunion du même public tant qu'ils ne sont ni traités ni
    repris ? Reco : oui.
12. **Compte rendu** : tout lien `https://` accepté (Doc, Drive, PDF), Google Doc suggéré ? Reco : oui.
13. **Notifier** : retirer la destination « Annonces » (404 en ligne) en le déplaçant ? Reco : oui.
14. **中文 du sélecteur** : « 应用 · 后台 » (à relire par Timothée) ? Reco : oui.

## Commandes

```bash
npm test -- tests/back-office-espace.spec.ts tests/back-office-admin.spec.ts tests/tableau-de-bord.spec.ts
npm test -- tests/barre-back-office.spec.ts tests/reunions.spec.ts tests/rappels-regroupes.spec.ts
npm test -- --project=tablette-paysage           # projet de U4
npm test -- tests/back-office-coupe.spec.ts      # second serveur, interrupteur coupé
npm test && npx tsc --noEmit && npm run lint && graphify update .
```

## Avancement

**05/10/2026 — R1 « Sujets à aborder » codée** (branche `lot/u6-back-office`, commit « feat(U6): R1 — sujets à
aborder… »). Le reste (B1 à B6, R2 à R4) n'est pas commencé.

- **Données** : sous-collection `evenements/{id}/sujets/{sid}` (`src/types/reunion.ts`), lue et écrite en REST
  (`src/lib/firebase/sujets.ts` : lire, ajouter, changer `ordre` ou `traite` par masque, retirer) ; calculs purs
  dans `src/lib/reunions/sujets.ts` (tri par `ordre` puis date d'ajout, rouge = Q9, nouvel ordre après un glisser
  qui ne réécrit que les sujets déplacés).
- **Droits en double** : `estDeLaReunion`, `peutAjouterSujet` (borne du début vérifiée dans le navigateur, relue à
  l'envoi), `peutRetirerSujet`, `peutOrdonnerSujets` dans `src/lib/access.ts` ; fonctions `reunion`, `organise`,
  `changeSeulement`, `estDeLaReunion` et bloc `match /sujets/{sid}` dans `firestore.rules`, tels que § Règles
  proposées (sans `equipe:`, qui vient avec R4).
- **Carte** `src/components/reunions/SujetsAborder.tsx`, posée sur la fiche d'aujourd'hui `/evenements/<id>`, sous
  la fiche, pour toute personne d'une réunion de pôle : la même carte sert l'App et la gestion (l'organisatrice y
  voit en plus poignées et cases) ; **B3 la posera sur la fiche du Back-Office**. Ordre au glisser et au clavier
  (`useSensorsAvecClavier`, `src/lib/dnd/sensors.ts` : capteur clavier de `@dnd-kit`, annonces en FR et 中文).
  Libellés `evenements.sujets.*` en FR et 中文.
- **Tests** : `tests/reunions.spec.ts`, 25 tests × ordinateur, téléphone, tablette (vus rouges carte coupée, puis
  verts) : droits purs, règles relues dans `firestore.rules`, tri, rouge, nouvel ordre, ajout à la fin à son nom,
  sujet vide, borne du début à l'horloge simulée (19:59 / 20:00, et ajout tapé avant, envoyé après), retrait
  (auteur, organisatrice, admin ; refusé à un autre membre), non-membre, évènement qui n'est pas une réunion,
  « traité », glisser, clavier, rouge après le début, captures (`test-results/reunions-captures/`).
- **Choix faits faute de réponse dans la spec** : après le début, le titre devient « Sujets » avec « N traités sur
  M » et sans compteur, comme `bo-reunion-apres-telephone` ; chaque sujet retirable a un bouton ✕ « Retirer »
  (absent des planches), avec confirmation ; l'ordre et « traité » restent modifiables après le début (pour cocher
  pendant ou après la réunion) ; rouge = `text-red-700` (`#b91c1c`, tout près du `#b3261d` de la planche ;
  le thème n'a pas de jeton « alerte » de ce ton) ; les sujets d'une réunion supprimée restent dans Firestore, illisibles (la règle relit la réunion).

À faire par Timothée : **publier `firestore.rules`** (bloc des sujets, R1) ; relire le 中文 de `evenements.sujets`
(`src/locales/zh-CN.json`). Après les tranches suivantes : republier les règles (compte rendu, réunions d'équipe,
`backOffice/{uid}`, création des profils) et cliquer une fois « Recalculer depuis l'organigramme ».
