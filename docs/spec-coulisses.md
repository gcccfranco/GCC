# Spec : chantier CO — Back-Office, les coulisses

**Statut** : spec écrite le 23/10/2026, décisions de la planche prises sur les recommandations (Timothée : « Prends tes
recommandations »). **Aucun lot n'a de go.** Un lot se code sur un mot explicite de Timothée, donné après cette spec.

Vision : `intent/vision-site.md` § « Le rôle du Back-Office (23/10/2026) » ; feuille de route § 3.AD.
Planches : tableau de bord https://claude.ai/artifact/6SUhvx1m9gfUrYK1m6D39d (diagnostic, dépassée) ; coulisses
https://claude.ai/artifact/QBui5Mk4Ue84wjufRBEJ3R (référence de ce chantier).

## Mots de Timothée

> « J'aime pas l'apparence du Dashboard […] j'ai l'impression que les données qu'on mets servent à rien. »
> « C'est tout le travail qu'on fait en amont d'un événement, voir si tout se passe bien, faire toutes les taches que
> les autres ne voient pas (réunions, planning, événements et tout). Ça doit être un espace pour aider les gens qui
> ont accès au backoffice à faire au mieux les tâches qu'ils ont à faire. »
> « Il faut que ça serve à l'église dans notre contexte, ce dont une église de 150-200 personnes a besoin. »

## Objectif

Le Back-Office devient **les coulisses** : une dizaine de responsables, plusieurs fois par semaine, sur les quatre
dispositions, y voient pour chaque culte (Culte Franco) et chaque évènement public **ce qui est prêt, ce qui manque,
qui en est chargé**, relancent en privé sur WeChat, et font leur part.

## Réussite (choisie par Timothée)

- Moins d'oublis le dimanche matin.
- Noël, Pâques, les sorties se préparent sans tout réinventer (modèles).
- Une charge mieux répartie (nombre par trimestre).
- Des réunions d'équipe plus courtes (état des lieux tout fait).

## Décisions — à ne pas rouvrir

| # | Décision |
| --- | --- |
| D1 | On prépare le **Culte Franco** et les **évènements publics** (`Evenement` hors réunions et hors `type: "info"`). Pas le Culte 中文 ni l'EDD : leurs grilles et setlists restent comme aujourd'hui, modifiables par ceux qui les remplissent. Réunions et répétitions = outils, pas des évènements à préparer. |
| D2 | **Une fiche par évènement** (un Culte Franco = une fiche par dimanche), onglets Préparation · Jour J · Bilan ; **bilan pour le Culte Franco seulement**, facultatif. |
| D3 | **Modèles par type** (« Culte Franco », « Noël », « Sortie »…) ; l'app **coche seule** ce qu'elle peut vérifier (marque « auto ») ; le reste se coche à la main. Modèles modifiés par les admins ; « Garder pour la prochaine fois » sur une ligne d'une fiche l'ajoute au modèle (ceux qui peuvent modifier la fiche). |
| D4 | **Une partie par équipe** dans chaque fiche. Membres d'une équipe : modifient sa partie ; admins : tout ; autres responsables : lecture de tout. Chaque ligne non faite dit **qui en est chargé**. |
| D5 | **Référent du culte** : surveille et relance, ne prépare pas. Personne fixe désignée par les admins ; sans référent, tout responsable peut relancer. |
| D6 | **Relance en privé sur WeChat** : « Copier le rappel » (une ligne) et « Copier tous les rappels » (par personne) copient un message prêt, **en tutoyant, avec un lien**, dans la langue de la personne. Pas de WhatsApp, pas de messagerie interne. |
| D7 | **Aucune notification** venant du Back-Office. Les rappels de l'App pour ceux qui servent restent ; « Notifier » de la partie Communication (prévenir l'église) reste. |
| D8 | **Communication** dans la fiche : plan d'échéances tiré du modèle (J−n), avec « Copier le message » / « Notifier » ; la fiche du Culte Franco reçoit **les annonces de ce dimanche** venues de toutes les fiches. |
| D9 | **Nombre de services par trimestre et par équipe** : défaut fixé par le **responsable de chaque équipe** ; on ne déclare que « moins ce trimestre », **raison facultative**, visible des responsables de l'équipe et des admins seulement ; la personne le déclare dans « Moi » ou son responsable pour elle. Le planning propose d'abord ceux qui sont en dessous ; au-delà **rien ne bloque**, pastille orange seulement. Pas de suivi pastoral. |
| D10 | **Tâches** : rattachées à une équipe, et à un évènement si besoin (déjà le cas : `Tache.evenement`). |
| D11 | **Réunion d'équipe** : ouvre sur un état des lieux tout fait (fiches où l'équipe a une partie, ce qui manque, tâches en retard, nombres du trimestre), puis les sujets. |
| D12 | **Jour J** : la fiche complète pour les responsables ; dans l'App, **en tête de l'accueil, la veille au soir et le jour même**, ceux qui servent voient le déroulé et leur rôle, sans les coulisses ; aussi dans « Mes services ». |
| D13 | **Menu** (8) : Accueil · Évènements (fiches, modèles) · Planning · Tâches · Équipes (réunions comprises) · Calendrier · Messages · Statistiques. |
| D14 | **Accueil fixe, le même pour tous** (piste A de la planche) : le prochain Culte Franco en grand (« 4/6 », ce qui manque, qui, « Copier le rappel », « Copier tous les rappels »), puis les autres fiches en cartes, « Pour toi », « Tes équipes ». **Le tableau de bord à widgets disparaît** ; barre du bas personnalisable, calendrier et statistiques restent. |
| D15 | **Fiche = piste A, par équipe** : une partie par équipe avec son état ; à droite (dessous en étroit) « Relancer » et « Annonces de ce dimanche ». |
| D16 | Le Back-Office **fait foi** pour ce qui est structuré (planning, tâches, inscriptions, déroulés) ; WeChat reste pour discuter. |

## Ce que le code montre (23/10/2026)

- **Les cultes ne sont pas des évènements** : le Culte Franco est la grille `culte` (`src/lib/planning/grilles.ts:108`,
  colonnes l.93-106), une ligne par dimanche dans `plannings/culte/dimanches/{date}` (`src/lib/firebase/planningGrille.ts`),
  **des noms en texte, pas des uid** ; le lien nom → profil passe par `UserProfile.planningName` (`src/types/user.ts:38`)
  et `loadPlanningNameIndex` côté serveur (`src/lib/push/recipients.ts`).
- **Setlist** du dimanche : `category` + `date` (`src/lib/firebase/setlists.ts:33`) ; publiée = `!isPrivate && !isDraft` ;
  présentation prête = `presentationUrl` (écrit par `/api/setlist/presentation`, l.115).
- **Évènements** : `src/types/evenement.ts:38` (inscriptions, `placesMax`, `organisateurUid`, `reunion`, `compteRendu`) ;
  droits `canCreateEvenement` / `canEditEvenement` (`src/lib/access.ts:334`, `:372`). **Réunion** = évènement
  `reunion: true` + sujets `evenements/{id}/sujets` (`src/types/reunion.ts:6`). **Annonce** = évènement `type: "info"`.
- **Tâches** : `equipes/{équipe}/taches/{id}`, `responsableUid` (null = l'équipe), `echeance`, `evenement` ; l'état fait
  vit dans `fois/{date}.etat` (`src/types/tache.ts:21`, `:46`).
- **Équipes** : `equipes/{id}`, membres avec `referent`, `sousEquipes`, `referentSous` (Louange : presidence, musiciens,
  choristes ; `src/types/equipe.ts:9`, `:18`) ; table `src/lib/equipes/table.ts:26`.
- **Absences** : `users/{uid}/absences/{id}` (`du`, `au`, `motif?`) ; `canVoirAbsencesDeTous` (`access.ts:495`).
- **Langue** d'une personne : seulement `notifPrefs/{uid}.lang` (`"fr" | "zh-CN"`, `src/types/user.ts:120`).
- **Petit déj** : `petitDej/{id}` (`lirePetitDej`, `src/lib/petitdej/lignes.ts:35`). **Scène** : `programmes/{id}/creneaux`.
- **Tableau de bord actuel** : `src/components/backOffice/TableauDeBord.tsx`, `widgets/` (11), `src/lib/tableauDeBord/`,
  préférences `backOffice/{uid}` (`tableauDeBord`, `barreDuBas`) ; menu `ENTREES` (`src/types/backOffice.ts:4`),
  `entreesBackOffice` (`access.ts:795`).
- **Accueil de l'App** = `/planning` (`src/app/page.tsx:17`) avec `CeDimanche` et `PourMoi` (`src/components/accueil/`).
- **Rappel du matin** (`/api/cron/reminders`) : services de chacun ; avec le back-office allumé, aussi tâches,
  évènements, scène, sujets, « sans équipe » du lundi, petit déj du mercredi.
- Tout le chantier est **derrière `BACK_OFFICE`** (`src/lib/backOffice.ts`), sauf le jour J dans l'App (lot CO8).

## Modèle

```ts
// src/types/coulisses.ts
type LigneModele = {
  id: string;                 // stable, pour « Garder pour la prochaine fois »
  equipe: string;             // id de equipes/{id}, ou "communication"
  titre: string;              // FR ; titreZh facultatif
  auto?: VerifAuto;           // si présent : cochée par l'app
  chargeDefaut?: "referent" | "referentSous:musiciens" | "colonne:ppt" | …;  // qui relancer par défaut
  jMoins?: number;            // communication : échéance J−n
  canal?: "annonce" | "wechat" | "notifier";   // communication
  message?: string;           // texte prêt (« Copier le message »)
};
type VerifAuto =
  | { k: "setlistPubliee" } | { k: "presentation" } | { k: "postesRemplis"; colonnes?: string[] }
  | { k: "poste"; colonne: string } | { k: "petitDej" } | { k: "inscriptions"; seuil?: number }
  | { k: "creneauxScene" };
type Modele = { id: string; nom: string; pour: "culteFranco" | "evenement"; lignes: LigneModele[]; majLe: string };
// modeles/{id} — lecture : responsables ; écriture : admins ; « Garder » : arrayUnion d'une ligne par qui peut modifier la fiche.

type Fiche = {
  id: string;                 // "culte-AAAA-MM-JJ" ou "ev-<idEvenement>"
  modele: string;             // id du modèle, copié à la création
  lignes: LigneModele[];      // copie du modèle + lignes ajoutées ; jamais réécrite par le modèle ensuite
  coches: Record<string, { fait: boolean; parUid: string; le: string; note?: string }>;  // lignes manuelles
  charges?: Record<string, { uid?: string; nom: string }>;  // qui est chargé, si différent du défaut
  deroule?: { heure: string; titre: string; pour?: string[] }[];   // onglet Jour J (colonnes de la grille ou équipes)
  bilan?: { bien?: string; coince?: string; changer?: string; parUid: string; le: string };  // Culte Franco seulement
};
// fiches/{id} — lecture : responsables ; écriture : admins, référent, et membres d'une équipe sur ses coches
// (règle par équipe : la clé de la coche porte l'équipe, vérifiée en rules).

// equipes/{id} : + parTrimestre?: number   (défaut, écrit par le référent de l'équipe)
// users/{uid}/trimestres/{AAAA-Tn} : { equipe: string; nombre: number; raison?: string; parUid: string }
//   lecture : la personne, référents de l'équipe, admins ; écriture : la personne ou un référent de l'équipe.
// config/coulisses : { referentCulteFranco?: { uid: string; nom: string } }   (admins)
```

- Une **fiche de culte** existe virtuellement pour tout dimanche : son état « auto » se calcule (grille, setlist,
  petit déj) ; le document `fiches/{id}` n'est créé qu'au premier geste (coche, chargé, déroulé, bilan), avec la copie
  du modèle. Une **fiche d'évènement** se crée quand on choisit un modèle depuis la page de l'évènement.
- **État « 4/6 »** = lignes faites / lignes de la fiche (auto + manuelles), communication comprise pour un évènement,
  hors communication pour un culte.
- **Qui est chargé** : poste vide → référent de la sous-équipe (Musiciens, Choristes, Présidence) ou de l'équipe qui
  remplit la colonne ; ligne d'équipe → `charges[id]`, sinon référent de l'équipe ; tâche liée → `responsableUid`.
- **Conflit d'absence** (ligne auto) : un nom de la grille dont le profil (`planningName`) a une absence ce jour-là ;
  le motif reste masqué selon `canVoirMotifAbsence`.
- **Rappel copié** : « Salut {prénom}, pour {évènement} {date}, il manque encore : {lignes}. Tu peux t'en occuper
  d'ici {jour} ? Merci ! {lien} » ; version chinoise si `notifPrefs.lang === "zh-CN"`. Le **lien** mène à la page de
  l'App où l'on agit (setlist, planning, évènement), pas à la fiche (la personne n'a pas forcément le Back-Office).
- **Annonces de ce dimanche** : échéances `canal: "annonce"` de toutes les fiches qui tombent dans la semaine qui
  précède ce dimanche, plus les évènements `type: "info"` actifs.

## Écrans (planche coulisses, piste A partout)

- **Accueil** (`/back-office`) : voir D14 ; téléphone : une colonne (prochain culte, Ensuite, Pour toi, Tes équipes) ;
  tablette portrait : prochain culte et Ensuite en pleine largeur, Pour toi et Tes équipes côte à côte ; tablette
  paysage et ordinateur : deux colonnes.
- **Évènements** (`/back-office/evenements`) : les fiches à venir (Culte Franco des 8 prochains dimanches, évènements
  publics), chacune avec son anneau ; onglet « Modèles » pour les admins. **Fiche** (`/back-office/evenements/[id]`) :
  onglets Préparation · Jour J · Bilan (culte seulement).
- **Planning** : grille actuelle + panneau de case (à droite en grand, feuille en étroit) : candidats triés (en
  dessous de leur nombre d'abord, absents grisés), « prévu n sur m », pastille orange sur une case au-delà.
- **Équipes › réunion** : état des lieux puis sujets et compte rendu (D11).
- **App, jour J** : bandeau et carte « Aujourd'hui » en tête de `/planning` pour ceux qui servent (D12).
- **Moi** : « Nombre de services ce trimestre », une ligne par équipe (défaut, « Moins ce trimestre », raison facultative).

## Ce qui sera construit (un lot = un go)

| Lot | Contenu | Vérifié par |
| --- | --- | --- |
| **CO1 — Socle et fiche du culte** | Types, `modeles/` et `fiches/` (REST), règles (`firestore.rules` + `access.ts`), modèle « Culte Franco » par défaut (setlist publiée, présentation, postes remplis par sous-équipe, orateur et traduction, petit déj, conflits d'absence), calcul de l'état, page fiche (Préparation, piste A), coches manuelles par équipe. | État calculé sur jeu d'essai ; coche d'une équipe refusée à un autre responsable ; 4 dispositions + 1 440 px. |
| **CO2 — Relances** | Qui est chargé, « Copier le rappel », « Copier tous les rappels », FR/中文, référent du culte (`config/coulisses`, réglé par les admins). | Texte copié exact (FR et 中文) ; presse-papier par l'évènement `copy` (règle des quatre systèmes). |
| **CO3 — Accueil fixe et menu** | Nouvel accueil (D14), menu à 8 entrées (Réunions dans Équipes), retrait du tableau de bord à widgets (composants, `src/lib/tableauDeBord/` sauf la barre du bas, champ `tableauDeBord` ignoré). | Mêmes données sur les 4 dispositions ; barre du bas inchangée ; plus aucun widget. |
| **CO4 — Fiches d'évènements** | Création d'une fiche depuis un évènement public (choix du modèle), lignes auto (inscriptions, créneaux de scène), « Garder pour la prochaine fois », onglet Modèles (admins). | Modèle copié puis indépendant ; ligne gardée présente à la fiche suivante. |
| **CO5 — Communication** | Plan d'échéances J−n, « Copier le message », « Notifier » (route existante `notify-evenement`), annonces de ce dimanche dans la fiche du culte. | Échéance du 22/11 dans la fiche du culte du 22/11 ; rien envoyé sans clic. |
| **CO6 — Nombre par trimestre** | `parTrimestre` par équipe, `users/{uid}/trimestres`, saisie dans Moi et par le référent, panneau de case du planning (tri, « prévu n sur m », pastille au-delà, jamais bloquant). | Tri des candidats ; raison invisible d'un responsable d'une autre équipe ; placement au-delà accepté. |
| **CO7 — Réunion d'équipe** | État des lieux en tête de la page d'une réunion (D11). | Données de l'équipe seule. |
| **CO8 — Jour J** | Onglet Jour J (déroulé saisi, copiable du dimanche précédent) ; dans l'App, carte « Aujourd'hui » la veille au soir et le jour même pour ceux qui servent (hors interrupteur), et dans « Mes services ». | Visible du seul servant, la veille dès 18 h, jusqu'au soir ; rien des coulisses. |
| **CO9 — Bilan** | Onglet Bilan du Culte Franco (trois champs facultatifs), le dernier bilan en tête de la fiche suivante. | Bilan relu le dimanche suivant. |

Ordre proposé : CO1 → CO2 → CO3 (le Back-Office est utilisable dès là) → CO6 → CO4 → CO5 → CO7 → CO8 → CO9.

## Tests

- Une spec Playwright par lot (`tests/coulisses-*.spec.ts`), **trois appareils**, et `SPECS_GRAND_ECRAN` pour les
  specs d'agencement (CO1, CO3, CO4, CO6) ; Firestore simulé (`tests/helpers/fakeSession.ts`) ; **noms fictifs
  inventés** ; chaque lot testé avec un profil en 中文 (libellés et rappel copié).
- `tests/tableau-de-bord.spec.ts` est retiré avec CO3 (le comportement qu'il garde disparaît) ; les tests de la barre
  du bas sont gardés.

## Hors périmètre

Culte 中文 et EDD ; suivi pastoral ; messagerie interne ; envoi WeChat automatique ; notifications du Back-Office ;
bilans d'évènements ; changement de la grille de planning elle-même.

## Questions ouvertes

1. **Le rappel du matin, côté Back-Office.** Avec le Back-Office allumé, il ajoute tâches, évènements, scène, sujets,
   « sans équipe », petit déj. D7 dit « aucune notification du Back-Office ». **Recommandation** : CO3 retire ces
   lignes et le rappel revient aux services de chacun ; une tâche dont l'auteur a coché « prévenir » garde sa
   notification (c'est un choix explicite, pas une relance).
2. **Le modèle « Culte Franco » par défaut** : les lignes de CO1 ci-dessus suffisent-elles, ou y ajouter
   « Répétition fixée » et « Sainte cène » (colonne optionnelle) ? **Recommandation** : ajouter « Répétition fixée »
   (manuelle, Louange), et « Sainte cène » seulement les dimanches où la colonne est posée.
3. **Référent du culte** : faut-il le montrer à tous (« Référente : Élise ») ? **Recommandation** : oui, en sous-titre
   de la fiche.

## Commandes

```bash
npx tsc --noEmit && npm run lint
npm test -- tests/coulisses-*.spec.ts       # trois appareils ; cinq projets pour les specs d'agencement
```

## Avancement

- 23/10/2026 : spec écrite. Aucun go.
