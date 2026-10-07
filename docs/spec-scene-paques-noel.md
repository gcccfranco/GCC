# Spec : réservation de la scène — Pâques · Noël

Suite du lot U1 (`spec-scene-saison.md`), dont elle **remplace l'organisation** (un programme à nom
libre, épinglé ou choisi par la bascule, réglé dans un écran à part) **sans en jeter la règle** : la
saison (dates, jours, plages, durée, qui réserve), la grille, le refus du chevauchement, les droits et
les rappels restent ceux de U1. Les lots 3 bis (`spec-programme-scene.md`) et 12
(`spec-programme-bascule.md`) restent vrais sauf ce qui est dit ici. Règles communes d'écran : planche
version 18 et `spec-agencement-v18.md` (écrite en parallèle).

Statut : **spec écrite le 06/10/2026 ; rien n'est codé ; attend le go.** Part en ligne avec tout le
Back-Office, à la fin du chantier (interrupteur retiré, fusion sur `main`).

## Mots de Timothée

> « il faudrait deux onglets, un pour Pâques et l'autre pour Noël, et dans ces onglets-là la
> coordination peut lancer les réservations de créneaux. Là c'est un peu mal foutu » (06/10/2026, soir).

> « la réservation de la scène, je trouve la fonctionnalité mal faite » (06/10/2026, soir).

> « Je suis ok pour tout » (06/10/2026, soir) : planche version 18 validée en entier, chaque question
> prend sa recommandation.

## Ce que le code montre (06/10/2026, branche `ui/apple-design`)

- **Un programme à nom libre.** `programmes/{id}` porte `nom`, `jourJ`, `debut`, `visible`, `passages`
  et la saison de U1 (`src/types/programme.ts:38-61`). Il est créé par `POST` avec un identifiant tiré
  au hasard (`createProgramme`, `src/lib/firebase/programmes.ts:126-130`, `post` `:79-88`) depuis le
  formulaire nom + jour J (`src/app/evenements/scene/ProgrammeForm.tsx:13-52`). Dans les tests, le
  programme existant s'appelle `programmes/noel` (`tests/programme-scene.spec.ts:56`) ; en base,
  l'identifiant réel n'est pas connu (la lecture de la base est refusée en mode auto) : un programme
  créé par l'écran a un identifiant tiré au hasard.
- **Un seul programme affiché**, calculé par `currentProgramme` (`src/lib/scene/dimanches.ts:81-89`) :
  épinglé (`visible`) d'abord, sinon le premier ouvert ou passé ; un brouillon jamais. Les appelants :
  la page (`SceneClient.tsx:50,92`), l'onglet (`src/components/evenements/EvenementsTabs.tsx:40-44`,
  dont le libellé est le `nom`), le cron des rappels (`src/app/api/cron/reminders/route.ts:93-101`),
  le calendrier (`src/lib/calendrier/charger.ts:44-47`, lien `"/evenements/scene"` en
  `src/lib/calendrier/entrees.ts:407`) et le widget du tableau de bord
  (`src/components/backOffice/widgets/WidgetScene.tsx:17-20`).
- **Pourquoi un seul** (lot 12, `feuille-de-route.md:128`) : `overlaps()` ne compare que deux créneaux
  du même jour (`dimanches.ts:46-52`) et la relecture avant écriture ne lit que les créneaux du
  programme montré (`Entrainements.tsx:89-92`). Deux programmes ouverts en même temps laisseraient deux
  groupes prendre la scène à la même heure.
- **La gestion est éparpillée.** Dans `SceneClient.tsx` (mode `gestion`, monté par
  `src/app/back-office/evenements/scene/page.tsx:19`) : « Modifier le programme », « Masquer »,
  « Nouveau programme » (`:218-233`), le formulaire du programme (`:241-251`), une bande « Saison : … —
  Modifier la saison » (`:273-280`), puis la liste « autres programmes » avec quatre badges et
  Afficher, Modifier, Supprimer (`:317-366`, `window.confirm` en `:147-149`). La saison s'ouvre dans
  un écran sans adresse qui prend la page (`:156-162`, `SaisonEcran.tsx`), qu'on quitte par « Fermer »
  (`SaisonEcran.tsx:54`) ; l'ordre de passage s'y ouvre par un bouton (`:67,94-100`), et aussi dans le
  volet « Programme {nom} » de la page des membres, modifiable par la coordination (`SceneClient.tsx:281-311`).
- **La page des membres est interminable** (audit du 06/10/2026, 4 876 px sur ordinateur, 7 458 px sur
  téléphone) : un bloc par jour réservable à venir (`Entrainements.tsx:124,136-196`), sous un bandeau
  bleu plein (`:141`), en deux colonnes sur ordinateur qui laissent des trous (`lg:grid-cols-2`,
  `:136`). Une réservation hors grille paraît en double : sa ligne, puis des lignes « Pris » sous elle
  (`lignesDuJour`, `src/lib/scene/saison.ts:136-153`, `LigneJour.tsx:29-34`). Chaque réservation
  modifiable porte deux grands boutons Modifier et Retirer (`Entrainements.tsx:178-187`) ; Retirer
  passe par `window.confirm` (`:111`, et `Apercu.tsx:73`).
- **La feuille « Réserver »** coche « Séance louange » d'avance (`Entrainements.tsx:208`) ; « Modifier »
  propose deux listes déroulantes natives, Jour puis Créneau (`CreneauForm.tsx:158-171`).
- **Les onglets** : « Calendrier » et le `nom` du programme affiché, ou « Scène » pour la coordination
  seule (`EvenementsTabs.tsx:41-44`) ; au Back-Office, « Évènements · Réunions · Scène »
  (`src/app/back-office/evenements/layout.tsx:15`, `sousPartiesEvenements`,
  `src/lib/access.ts:584-596`).
- **Droits** : `isCoordination` (`access.ts:73-78`, `firestore.rules:139-141`) écrit les programmes
  (`firestore.rules:165-167`) ; un membre réserve dans une saison ouverte pour des groupes permis
  (`reservable()`, `firestore.rules:173-186` ; miroir `canReserverPour`, `access.ts:116-127`).
- **La page sort de l'agencement commun** : sous `/evenements/scene`, `SectionEvenements` pose la barre collante
  `SectionTabs` puis une colonne `max-w-[1080px] mx-auto` (`src/app/evenements/SectionEvenements.tsx:11-16`) ;
  au Back-Office, le layout n'affiche son en-tête que sur ses trois adresses de liste
  (`src/app/back-office/evenements/layout.tsx:25-29`) ; `SECTIONS_EN_DEUX_VOLETS` range `/evenements/scene` sous
  le préfixe `/evenements` de l'agenda (`src/lib/deuxVolets.ts:26-38`, le premier préfixe gagne).
- **Tout est derrière l'interrupteur** : la section Évènements répond 404 sans `BACK_OFFICE`
  (`src/app/evenements/layout.tsx:11`), le cron ne lit la scène qu'avec lui (`route.ts:244`),
  `tests/back-office-coupe.spec.ts:66` vérifie `/evenements/scene` et `/back-office/evenements/scene`.

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 03–04/10/2026 | Toujours vrai (U1) : la coordination définit la saison (dates, jours, plages, durée, qui réserve) ; pas de validation de chaque demande ; une réservation = un créneau de la grille ; « Qui peut réserver » limite le « Qui » ; un brouillon reste invisible tant que les réservations ne sont pas lancées ; mise en ligne avec tout le Back-Office. |
| 14–18/09/2026 | Toujours vrai (3 bis, 12) : chevauchement refusé ; remerciement sept jours après le jour J ; ordre de passage tenu à la main ; rappels fondus dans le rappel du matin ; rien sans compte. |
| 06/10/2026 | **Deux onglets fixes, Pâques et Noël**, pour les membres et pour la coordination ; la coordination **lance les réservations** dans l'onglet de la fête. |
| 06/10/2026 | Planche version 18, rangée R17, **piste A** : Évènements › **Calendrier · Pâques · Noël** à plat (App) et **Évènements · Réunions · Pâques · Noël** (Back-Office) ; **une semaine à la fois, en liste**, « Mes réservations » en tête ; une réservation hors grille sur **une** ligne ; « Quoi » non coché d'avance ; Déplacer, Modifier, Retirer dans « ⋯ », confirmation dans l'app. |
| 06/10/2026 (plus tard le soir) | **Réunions devient une entrée à part de la barre latérale du Back-Office** (« il faudrait que les réunions aient leurs onglets à eux, c'est-à-dire qu'il faut mettre l'onglet Réunion dans la barre latérale ») : le rail de la section Évènements au Back-Office devient **Évènements · Pâques · Noël** ; les réunions vivent à `/back-office/reunions` (voir `spec-agencement-v18.md`, B4 et B15). |
| 06/10/2026 | Une fête sans saison ouverte garde son onglet : « Les réservations ouvriront le … ». Après le jour J : remerciement sept jours, puis l'année suivante ; les années passées se retrouvent ; « **Préparer Noël 2027** » reprend les réglages. |
| 06/10/2026 | L'ordre de passage est à **un seul endroit**, en bas de l'onglet de la fête. Le réglage de la saison est au **Back-Office**, dans l'onglet de la fête, avec « **Lancer les réservations** » ; brouillon tant qu'il n'est pas touché ; enregistrement à chaque changement. |
| 06/10/2026 | Règles communes v18 : titre au-dessus des deux volets ; rail gris à pastille blanche = onglets de section, pilules = filtres ; un seul bouton plein à l'encre ; suppressions dans « ⋯ » avec confirmation. |

## Décisions prises ici

| # | Décision | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Une édition par fête et par année** : `programmes/{fete}-{annee}` (`noel-2026`, `paques-2027`), avec deux champs nouveaux `fete: "paques" \| "noel"` et `annee: number` (l'année du jour J). La saison de U1 et `passages` ne changent pas de forme ; les créneaux restent en sous-collection. | L'identifiant se calcule depuis l'onglet et l'année : plus de liste à parcourir pour trouver « le » programme, plus de `nom` libre. La sous-collection, les règles et la route de conflit ne voient qu'un `programmes/{id}` (`firestore.rules:165-186`) : rien à réécrire. |
| Q2 | **Un programme d'avant ce lot est lu sans migration** : sans `fete`, sa fête se déduit du mois de son jour J (décembre → Noël ; mars ou avril → Pâques) et son année de celle du jour J. L'actuel Noël (`programmes/noel` dans les tests, un identifiant au hasard en base) est donc lu comme **Noël 2026**, quel que soit son identifiant. Un programme dont le jour J tombe un autre mois n'appartient à aucune fête : il n'apparaît plus, ses données restent. Si deux documents prétendent à la même édition, celui à l'identifiant `{fete}-{annee}` l'emporte. | `createProgramme` tire l'identifiant au hasard (`programmes.ts:126-130`) : chercher `programmes/noel` en base pourrait ne rien trouver. Le jour J est toujours là (`types/programme.ts:42`). |
| Q3 | **Le jour J par défaut** : Noël = 24 décembre ; Pâques = calcul grégorien (2025 : 20 avril ; 2026 : 5 avril ; 2027 : 28 mars ; 2028 : 16 avril). Modifiable dans la saison. | Planche : « Jour J : dimanche 28 mars 2027 — Calculé pour Pâques ; modifiable » ; « jeudi 24 décembre » pour Noël 2026. |
| Q4 | **L'édition d'un onglet** (`editionCourante(fete, programmes, today)`) : l'année du jour, sauf si son jour J + 7 jours est passé, auquel cas l'année suivante. Le jour J lu est celui du document s'il existe, sinon celui de Q3. Le 28/12/2026, Noël montre Noël 2026 (remerciement) ; le 01/01/2027, Noël 2027. Le 06/10/2026, Pâques montre Pâques 2027. | Garde la règle du lot 12 (`archiveDate`, `dimanches.ts:58-61`) fête par fête, sans épinglage. |
| Q5 | **État d'une édition** (`etatEdition`) : `aucune` (pas de document), `brouillon` (`ouvert === false`), `bientot` (lancée, avant `debut`), `ouvertes` (de `debut` à la fermeture), `fermees` (après la fermeture, jusqu'au jour J), `passee` (du lendemain du jour J à J + 7). Un document sans `ouvert` compte comme lancé (U1, Q7). | Compose `programmeState` et `reservationsClosed` (`dimanches.ts:36-38,66-71`), déjà testés. |
| Q6 | **Création à la première action** de la coordination dans l'onglet (un réglage de la saison, une ligne de l'ordre de passage, « Lancer les réservations », « Préparer … ») : `POST programmes?documentId={fete}-{annee}`, en brouillon. Une course entre deux coordinateurs (réponse 409) relit et applique le changement au document existant. | Firestore REST crée un document à identifiant choisi par `documentId` ; la règle `create` reste `isCoordination()` (`firestore.rules:167`). Rien n'est écrit tant que personne n'agit : ouvrir l'onglet ne crée rien. |
| Q7 | **Réglages par défaut d'une édition nouvelle** : ceux de l'édition précédente de la même fête si elle existe (plages, durée, « Qui peut réserver », et l'ouverture au même nombre de jours avant le jour J) ; sinon dimanche 14:00–19:00, 1 h, tout membre connecté (U1, Q7), ouverture le lundi sept semaines avant la semaine du jour J (Pâques 2027 : lundi 1er février). Fermeture absente = dernier dimanche avant le jour J. Ordre de passage vide, `ouvert: false`. | « Préparer Noël 2027 » reprend les réglages (planche). L'ouverture « au jour de la création » de U1 n'a pas de sens pour une fête préparée des mois avant ; la planche montre Pâques 2027 ouvert le 1er février. |
| Q8 | **Les deux fêtes ne se chevauchent pas** : la période de réservation d'une édition ne peut pas croiser celle de l'édition de l'autre fête (non archivée). Erreur sous le champ « Réservations », rien n'est écrit : « Les réservations de Noël 2026 courent jusqu'au dimanche 20 décembre : commence après. » | La scène est une seule salle et `overlaps()` ne compare que les créneaux d'une édition (`dimanches.ts:46-52`, `Entrainements.tsx:89-92`). Interdire le croisement des périodes garde ce contrôle juste sans lire deux sous-collections à chaque réservation ; Pâques (février–mars) et Noël (octobre–décembre) ne se croisent pas dans les faits. |
| Q9 | **Adresses** : `/evenements/scene/[fete]` (App) et `/back-office/evenements/scene/[fete]` (Back-Office), `fete` ∈ `paques`, `noel`, sinon 404 ; `?annee=2025` pour une autre année ; `?semaine=AAAA-MM-JJ` (le lundi) pour la semaine choisie, `?vue=saison \| reservations \| ordre` au Back-Office et `?vue=ordre` dans l'App ; ces paramètres remplacent l'adresse sans entrée d'historique. `/evenements/scene` et `/back-office/evenements/scene` renvoient vers la fête dont l'édition a le jour J le plus proche. | Le dossier `scene` statique passe devant `[id]` (comme aujourd'hui) ; `SectionEvenements.tsx:11` et `back-office-coupe.spec.ts:66` couvrent déjà `/evenements/scene` ; les anciens liens (calendrier, notifications) continuent de marcher. Paramètres d'adresse comme l'aperçu de setlist (`spec-pages-en-grand.md`, Q4). |
| Q10 | **Lecture partout par fête** : `editionsAffichees(programmes, today)` rend les éditions des deux fêtes qui ne sont ni `aucune` ni `brouillon` ; le cron des rappels, le calendrier et le widget la lisent à la place de `currentProgramme`, qui disparaît. Le widget, sans programme choisi, prend l'édition au jour J le plus proche. | Les cinq appelants de `currentProgramme` (voir plus haut) suivent la même règle, comme le voulait le lot 12 ; les rappels J-7, J-3, J-1 partent pour les deux fêtes (`route.ts:93-101`, requête `in` sur des dates, valable pour n'importe quel jour). |
| Q11 | **Le titre affiché se calcule** : « Noël 2026 », « Pâques 2027 » ; 圣诞节 2026, 复活节 2027. `nom` est encore écrit à la création (libellé français) pour les anciens lecteurs, mais plus lu par les écrans. `visible` n'est plus ni lu ni écrit (il reste sans effet dans les anciens documents). | Plus de nom libre (décision du 06/10) ; le titre suit la langue. |
| Q12 | **Une semaine à la fois** : les jours réservables sont rangés en semaines du lundi au dimanche ; une semaine dit ses jours (« 10 – 11 oct. »), une case par créneau (pleine = pris) et « N places libres » ou « complet ». La semaine choisie par défaut est la première qui a un jour réservable à partir d'aujourd'hui ; les semaines passées attendent derrière « Semaines passées (n) ». | Planche `v18-scene-a-membres-*` ; répond à l'audit (« rien pour aller à une semaine, voir le prochain créneau libre »). |
| Q13 | **Une réservation hors grille tient sur une ligne** : `lignesDuJour` ne rend plus de ligne « Pris » ; une réservation porte le nombre de créneaux de la grille qu'elle couvre et absorbe ceux qu'elle chevauche ; la ligne en prend la hauteur et dit « 17:00 – 18:30 · prend aussi le créneau de 18:00 ». Elle compte comme pris dans les cases de la semaine. | Audit, point 3 ; la règle Q8 de U1 (rien ne disparaît, la réservation reste à son heure) est gardée. |
| Q14 | **« Mes réservations »** = mes réservations à venir de l'édition (`auteurUid` = moi), en tête, masqué s'il n'y en a pas ; toucher une ligne choisit sa semaine. « ⋯ » sur une réservation que je peux changer (`canEditCreneau`, inchangé) : **Déplacer** (une feuille qui liste, jour par jour, les créneaux libres en pastilles — `creneauxLibres`, `saison.ts:246-258` — sans liste déroulante), **Modifier** (Quoi, Qui, Note), **Retirer** (confirmation dans l'app). Le menu est `MenuActions` et la confirmation `useConfirmer()` de `spec-agencement-v18.md` (R9, posés par F1) : pas de second menu ni de second dialogue. Sur une réservation à moi, la pastille « à moi » remplace mon nom. | Planche (menu ouvert sur `v18-scene-a-membres-ordinateur`) ; « Retirer : libère le créneau, sans fenêtre du navigateur ». |
| Q15 | **Feuille « Réserver »** : rien de coché ; le bouton plein dit « Choisis quoi et qui » et reste inactif tant que Quoi et Qui ne sont pas choisis, puis « Réserver ». Note « facultatif ». Au-delà de neuf groupes permis, « + N » déplie le reste. | Planche `v18-scene-a-feuille-telephone`. |
| Q16 | **L'ordre de passage** a sa ligne en bas de la colonne de la fête (« Ordre de passage du jour J — jeudi 24 décembre · 9 numéros », ou « · aucun numéro pour l'instant »). Il s'ouvre à droite en grand, en page (`?vue=ordre`) sur téléphone. Il ne **se modifie qu'au Back-Office**, jusqu'au jour J compris ; ensuite il se lit, avec « Imprimer » (`window.print()`, la page imprimée ne garde que la liste). L'App le montre en lecture à tous, coordination comprise. | Décision « un seul endroit » ; la planche écrit « publié en décembre » côté membres, mais le modèle n'a pas d'état « publié » (les passages se lisent par tout connecté, `firestore.rules:166`) : on montre le nombre de numéros, sans inventer de publication. |
| Q17 | **Membres, selon l'état** : `aucune` → carte « Les réservations de Pâques 2027 ne sont pas encore ouvertes. » ; `brouillon` et `bientot` → « Les réservations ouvriront le lundi 1er février » avec les jours et la fermeture ; dans ces trois états, « Les années passées » (titre, jour J, nombre de numéros) et, à droite, l'ordre de passage de la dernière année avec « Comment réserver ? ». `ouvertes` → Mes réservations, Entraînements, la semaine. `fermees` → l'ordre de passage à droite, plus d'Entraînements. `passee` → le remerciement (`planning.scene.passed`, `passedHint`) et l'ordre de passage. | Planches `v18-scene-a-sans-saison-*` et texte de la planche du brouillon (« Ils voient « Les réservations ouvriront le lundi 1er février » ») ; un brouillon reste **non réservable et sans grille** (U1, Q3), seule sa date d'ouverture prévue s'annonce. Sans document (`aucune`), personne n'a encore choisi de date : annoncer celle que calcule Q7 promettrait une date que la coordination n'a pas vue ; l'onglet reste visible, avec la phrase sans date. |
| Q18 | **Back-Office, colonne de la fête** : titre de l'édition avec le **menu des années** (toutes les éditions de la fête, la plus récente d'abord, et la suivante si elle existe), pastille d'état (Brouillon, Lancée pour `bientot`, Ouvertes, Fermées, Terminé) ; « Cette fête » : **Saison** (résumé) et **Toutes les réservations** (« 12 à venir · 1 hors grille », inactif avant le lancement) ; Entraînements (les semaines, comme les membres, avec « ⋯ » sur toutes les réservations) une fois lancé ; « Les années passées » en brouillon ; l'ordre de passage en bas. Vue de droite par défaut : Saison (`aucune`, `brouillon`), Toutes les réservations (`bientot`, `ouvertes`, `fermees`), ordre de passage (`passee`). | Planches `v18-scene-a-coord-avant/pendant/apres-ordinateur`. |
| Q19 | **Vue Saison** : la carte de U1 (`SaisonForm`) gagne le **Jour J** en tête ; « Réservations » du … au … avec l'aide « Premier jour réservable : samedi 6 février. Fin : le dernier dimanche avant le jour J. » ; l'aide de la durée compte les créneaux par jour ; à côté, l'**aperçu des membres** sur une semaine (‹ ›) et « Dimanche 7 février : 5 créneaux, de 14:00 à 19:00. 7 semaines, 49 créneaux en tout. » (chiffres de la planche, qui reprend samedi 10–12 et dimanche 14–19 d'une Pâques 2026 ; sans édition précédente, Q7 donne dimanche seul : « Premier jour réservable : dimanche 7 février », 35 créneaux) Titre « Saison de Pâques 2027 » + pastille, sous-titre « Enregistré à chaque changement · seuls la coordination et les admins le voient », bouton plein **« Lancer les réservations »** (un `PATCH` de `ouvert: true`, refusé tant qu'une erreur de saison existe). Lancée, la saison reste réglable ; le bouton laisse place à « Réservations lancées ». | Planche `v18-scene-a-coord-avant-ordinateur` ; écriture champ par champ déjà faite par U1 (`updateProgramme` en `updateMask`, `programmes.ts:91-100,132-135`). |
| Q20 | **Vue Toutes les réservations** : tableau Jour · Créneau · Quoi · Qui · Réservé par · « ⋯ », un jour par groupe de lignes ; filtres en pilules « À venir n · Passées n · Hors grille n » (`Pilules`, F1 de l'agencement) ; une ligne hors grille surlignée, avec « Déplacer » à la place de « ⋯ » ; « Voir comme un membre » ouvre l'onglet de l'App. Elle remplace la liste « N réservations hors grille » de l'aperçu (`Apercu.tsx:53,116`). | Planche `v18-scene-a-coord-pendant-ordinateur` ; audit, côté coordination, point 4 (« aucune vue d'ensemble »). |
| Q21 | **Après le jour J** (`passee`) : carte « Noël 2026 est passé — Les membres voient le remerciement jusqu'au jeudi 31 décembre, puis l'onglet annonce Noël 2027. L'ordre de passage reste ici, en lecture. » et « **Préparer Noël 2027** » (crée `noel-2027` en brouillon selon Q7, puis ouvre sa saison par `?annee=2027`). Le bouton disparaît si l'édition suivante existe. | Planche `v18-scene-a-coord-apres-ordinateur`. |
| Q22 | **Téléphone** : App en une colonne (titre, rail, en-tête de la fête, Mes réservations, les semaines en pastilles qui défilent en largeur, les jours de la semaine choisie, l'ordre de passage en carte) ; Back-Office : la saison **en résumé**, une ligne par réglage (Jour J, Réservations, Jours et plages, Un créneau dure, Qui peut réserver) qui ouvre **une feuille** avec ce réglage seul, puis « Lancer les réservations » pleine largeur, puis l'aperçu ; pendant la saison, « Cette semaine » en cartes par jour. Tablette portrait : comme le téléphone, mais la carte de saison entière au lieu du résumé. Deux volets dès le seuil de U5 (`useDeuxVolets`, `src/hooks/useDeuxVolets.ts:37`), posés par le même `DeuxVolets` que les autres listes (liste en carte, R10 de l'agencement). | Planches `v18-scene-a-membres-telephone`, `v18-scene-a-coord-avant/pendant-telephone` ; seuil commun du site. |
| Q23 | **Ce qui disparaît** : le nom libre et `ProgrammeForm.tsx` ; « Nouveau programme » ; « Masquer » et « Afficher » (`show`, `SceneClient.tsx:106-112`) ; la liste des autres programmes et ses badges, et donc « Supprimer » un programme ; « Modifier le programme » (seul le jour J reste, dans la saison) ; `SaisonEcran.tsx` et son « Fermer » ; la bande « Saison : … » ; le volet « Programme {nom} » des membres ; le mode `gestion` de `SceneClient` ; `currentProgramme` (et son test) ; `window.confirm` dans la scène. | Une édition par fête et par année existe toujours en pensée : il n'y a plus rien à créer, nommer, épingler ou supprimer. Une saison se remet à zéro en la réglant. |
| Q24 | **Ce qui se garde tel quel** : `src/lib/scene/saison.ts` (sauf `lignesDuJour`, Q13, et l'erreur de Q8), la sous-collection des créneaux et leur forme (champ `dimanche` compris, U1 Q9), le refus du chevauchement à la relecture et `/api/scene/conflit`, `canReserverPour` et `reservable()`, `isCoordination`, `canEditCreneau`, la feuille de réservation (`CreneauForm`, sans les listes déroulantes), `OrdrePassage.tsx` (glisser-déposer), `QUI`, `QUOI`, `FAMILLES`, les rappels (`sceneReminder`, `quiCategories`). | Rien de ce qui marche ne se perd ; **aucun droit ne change**, donc ni `access.ts` ni `firestore.rules` ne bougent pour les droits, et il n'y a **rien à publier**. |

## Objectif

1. Un membre ouvre Évènements › Noël et voit **tout de suite** ses réservations, puis la semaine en
   cours, sans faire défiler vingt-quatre jours ; il réserve un créneau libre en deux gestes et
   retrouve, déplace ou retire sa réservation depuis « Mes réservations ».
2. La coordination prépare chaque fête **dans son onglet** du Back-Office : régler, voir l'aperçu,
   lancer, suivre toutes les réservations, tenir l'ordre de passage, puis préparer l'année suivante.
3. Rien de ce qui marche ne se perd : saison, grille, chevauchement, droits, rappels, archivage.

**Réussite** (horloge au vendredi 09/10/2026) : Jo (membre) ouvre Évènements : il voit « Calendrier ·
Pâques · Noël ». Noël montre « Noël 2026 · Jour J : jeudi 24 décembre · réservations jusqu'au dimanche
20 décembre » (l'ancien document, sans `fete`), « Mes réservations (2) », puis la semaine du 10 au 11
octobre. Le 11 octobre, la réservation 17:00–18:30 tient sur une ligne, « prend aussi le créneau de
18:00 ». Il réserve 14:00 : rien n'est coché, le bouton dit « Choisis quoi et qui » ; il choisit
« Chant » et « Gp Paix » : le créneau passe à son nom, la case de la semaine se remplit. « ⋯ » › Retirer
ouvre une confirmation de l'app, aucune fenêtre du navigateur. Pâques montre « Les réservations de
Pâques 2027 ne sont pas encore ouvertes. ». Alice (coordination) ouvre Back-Office › Évènements ›
Pâques : la saison de Pâques 2027 en brouillon, jour J dimanche 28 mars 2027, ouverture lundi 1er
février ; elle passe la durée à 1 h 30 : `programmes/paques-2027` est créé, avec `fete`, `annee`,
`ouvert: false`. Jo voit alors « Les réservations ouvriront le lundi 1er février ». Alice met
l'ouverture au 1er décembre 2026 : erreur (Noël 2026 court jusqu'au 20 décembre), rien n'est écrit.
Le 28 décembre, Noël montre le remerciement ; Alice presse « Préparer Noël 2027 » : `noel-2027` reprend
samedi et dimanche, 1 h et les familles de 2026. Le 1er janvier 2027, l'onglet Noël de Jo annonce
Noël 2027.

## Modèle et règles

Champs ajoutés à `programmes/{id}` (`src/types/programme.ts`), facultatifs pour les anciens documents :

| Champ | Type | Sens |
| --- | --- | --- |
| `fete` | `"paques" \| "noel"` | la fête ; absent = déduite du mois du jour J (Q2) |
| `annee` | `number` | l'année du jour J ; absent = celle du jour J |

`visible` sort du type (plus lu). Les champs de U1 (`debut`, `fin`, `plages`, `duree`, `quiAutorises`,
`ouvert`) et `passages` ne changent pas.

Fonctions pures, nouveau fichier `src/lib/scene/fetes.ts` :

| Fonction | Rôle |
| --- | --- |
| `FETES`, `type Fete` | `["paques", "noel"]`, dans l'ordre des onglets |
| `paques(annee)` | dimanche de Pâques (calcul grégorien) |
| `jourJParDefaut(fete, annee)` | Noël : `AAAA-12-24` ; Pâques : `paques(annee)` |
| `idEdition(fete, annee)` | `"noel-2026"` |
| `feteDe(p)`, `anneeDe(p)` | champ, sinon déduit du jour J (Q2) ; `null` hors fête |
| `editionsDe(fete, programmes)` | les documents de cette fête, par année décroissante (l'identifiant canonique gagne) |
| `editionCourante(fete, programmes, today)` | `{ fete, annee, programme \| null }` (Q4) |
| `etatEdition(edition, today)` | `aucune`, `brouillon`, `bientot`, `ouvertes`, `fermees`, `passee` (Q5) |
| `editionsAffichees(programmes, today)` | les éditions courantes des deux fêtes, hors `aucune` et `brouillon` (Q10) |
| `reglagesRepris(precedent \| null, fete, annee)` | le document d'une édition nouvelle (Q7) |
| `libelleEdition(fete, annee, langue)` | « Noël 2026 », « 复活节 2027 » (Q11) |

Dans `src/lib/scene/saison.ts` :

| Fonction | Changement |
| --- | --- |
| `lignesDuJour` | plus de type `pris` ; une réservation porte `couvre` (créneaux de la grille absorbés) (Q13) |
| `semainesDe(saison, jourJ, creneaux)` | nouvelle : `{ lundi, jours, cases: boolean[], libres }[]` (Q12) |
| `erreursSaison(saison, jourJ, autre?)` | nouvelle erreur `autreFete` quand la période croise celle de l'autre fête (Q8) |
| `compteCreneaux(saison, jourJ)` | nouvelle : créneaux par jour de la semaine, nombre de semaines et total, pour les aides de Q19 |

Dans `src/lib/firebase/programmes.ts` : `creerEdition(fete, annee, data)` (`POST
programmes?documentId=…`, relit sur 409) ; `listProgrammes` ne change pas. Les écritures restent en
REST avec le jeton Firebase.

`src/lib/scene/dimanches.ts` : `currentProgramme` disparaît (Q23) ; `programmeState`, `archiveDate`,
`reservationsClosed`, `overlaps`, `todayIso` restent. `sundaysBetween` n'a plus d'appelant depuis U1 :
il est signalé, pas retiré ici.

**Droits** : inchangés. `firestore.rules` garde `allow create, update, delete: if isCoordination()` sur
`programmes/{id}` (un `documentId` choisi passe par la même règle `create`) et `reservable()` sur les
créneaux ; `access.ts` garde `isCoordination`, `canEditCreneau`, `canReserverPour`.
`sousPartiesEvenements` rend toujours `"scene"` ; le layout du Back-Office en tire les deux onglets
Pâques et Noël (affichage seulement). Depuis T2a de `spec-agencement-v18.md` (entrée Réunions à part), elle ne
rend plus `"reunions"` : le rail est « Évènements · Pâques · Noël ». L'entrée Évènements reste ouverte à la
coordination (`isCoordination`), donc les onglets de la fête aussi.

**Interrupteur** : tout reste derrière `BACK_OFFICE` — la section Évènements (`evenements/layout.tsx:11`),
le Back-Office, la lecture de la scène par le cron (`route.ts:244`). Hors ligne, `/evenements/scene/noel`
et `/back-office/evenements/scene/paques` répondent 404.

## Écrans

Planche version 18, rangée R17, piste A (artefact `1d4ZW7Y9NVHcsLB9YrrbrA`, module
`scripts/planche/scene_paques_noel.py`, rendus `scripts/planche/root/project/v18-scene-a-*.dc.html`,
aperçus `scripts/planche/apercu/v18-scene-a-*.png`) ; libellés repris tels quels, données fictives.

| Écran | Ordinateur | Téléphone |
| --- | --- | --- |
| Membres, saison ouverte | `v18-scene-a-membres-ordinateur` | `v18-scene-a-membres-telephone` |
| Feuille « Réserver » | (centrée, étroite) | `v18-scene-a-feuille-telephone` |
| Membres, sans saison ouverte | `v18-scene-a-sans-saison-ordinateur` | `v18-scene-a-sans-saison-telephone` |
| Coordination, avant (brouillon) | `v18-scene-a-coord-avant-ordinateur` | `v18-scene-a-coord-avant-telephone` |
| Coordination, pendant | `v18-scene-a-coord-pendant-ordinateur` | `v18-scene-a-coord-pendant-telephone` |
| Coordination, après | `v18-scene-a-coord-apres-ordinateur` | (comme l'ordinateur, une colonne) |

**En-tête** : celui de toute la section Évènements, **au-dessus des deux volets** (`EnTetePage`, posé par T7 de
`spec-agencement-v18.md` dans l'App et par T2b au Back-Office) : titre « Évènements », même sous-titre que
l'onglet Calendrier (le rail ne bouge pas d'un onglet à l'autre), rail ; sur Pâques et Noël, pas d'action
principale. La planche R17 dessine titre et rail dans la colonne de gauche, avec la mise en page de U4 bis ; la
règle commune validée le même soir (« titre au-dessus des deux volets ») l'emporte.

**App, ordinateur et iPad paysage** : à
gauche (400 px, la liste en carte de `DeuxVolets`) l'en-tête de la fête, « Mes réservations » (n), « Entraînements » avec « Semaines
passées (n) » et la liste des semaines (la choisie à l'encre), l'ordre de passage collé en bas ; à
droite « Semaine du 10 au 11 octobre », « 3 places libres · un créneau = 1 h », ‹ ›, une carte par jour
(tuile de date, « Samedi 10 octobre », « 1 place libre ») et ses lignes : heure, « Libre · Réserver »,
ou « Quoi · Qui » avec l'auteur ou « à moi » et « ⋯ ». Halo de la couleur de la scène
(`PLANNING_COLORS.scene`, gelée). « Gérer dans le Back-Office » reste pour la coordination, vers
l'onglet de la même fête.

**App, téléphone et tablette portrait** : une colonne ; les semaines en pastilles qui défilent en
largeur (seule la bande défile, pas la page), la semaine choisie dessous.

**Back-Office** : en-tête de la section, rail « Évènements · Pâques · Noël » (Réunions est une entrée à part de la barre latérale, décision du 06/10 au soir) ; colonne de la
fête (Q18) et vue de droite (Q19, Q20, Q21) ; halo de la scène comme dans l'App (la planche le pose aussi au
Back-Office ; R12 de l'agencement : une page qui a son halo le garde) ; téléphone selon Q22.

**FR et 中文** pour tout : 复活节, 圣诞节 ; « 预约将于{{date}}开放 », « 我的预约 », « 启动预约 »,
« 为2027年圣诞节做准备 », « 上场顺序 »… Timothée relit le 中文.

**Composants communs** (F1 et F2 de `spec-agencement-v18.md`, à verser avant P4) : `EnTetePage`, `OngletsRail`
et `Pilules` (`src/components/layout/Onglets.tsx`), `MenuActions`, `useConfirmer`, `DeuxVolets` en liste-carte,
`Retour`. La scène n'en écrit aucun autre.

## Ce qui sera construit — neuf tranches

Chacune se vérifie seule, suite verte, `tsc` et `lint` propres ; un commit par tranche sur une branche
de lot (`lot/scene-paques-noel`), rien sur `main`. **Ordre avec l'agencement** : P1 à P3 à tout moment ;
P4 à P9 après F1 et F2 ; **P4 après T7** (`SectionEvenements.tsx`, `EvenementsTabs.tsx`) et **P7 après T2a et T2b**
(`back-office/evenements/layout.tsx`), qui posent l'en-tête de la section.

| Tranche | Contenu | Vérifié par |
| --- | --- | --- |
| **P1 — La règle des fêtes** (pur) | `src/lib/scene/fetes.ts` (tableau ci-dessus), `fete` et `annee` dans `Programme`, lecture dans `fromFsProgramme` ; `scene-paques-noel.spec.ts` ajouté à `SPECS_GRAND_ECRAN`. Aucun écran ne change. | Tests des fonctions : dates de Pâques, déduction d'un ancien document, édition courante autour du 24/12 et de J + 7, états, réglages repris. |
| **P2 — La grille** (pur, une ligne d'écran) | `lignesDuJour` sans « Pris » avec `couvre`, `semainesDe`, `compteCreneaux`, erreur `autreFete` ; `LigneJour.tsx` rend une réservation qui couvre plusieurs créneaux sur une ligne. | Tests des fonctions ; la page actuelle n'a plus de « Pris » sous une réservation hors grille. |
| **P3 — Les lecteurs** | `creerEdition` ; cron (`sceneCreneaux`), calendrier (`charger.ts`, `entrees.ts` : `DonneesCalendrier.scene` devient un tableau d'éditions, `entrees.ts:109,388-407`, lien vers la fête ; `deplacer.ts:105-117` cherche l'édition qui porte le créneau), widget et ses réglages passent à `editionsAffichees` ; `currentProgramme` retiré avec son test. | Calendrier : créneaux des deux fêtes, lien `/evenements/scene/noel`, déplacer un créneau de Pâques reste dans Pâques ; widget : édition la plus proche ; un brouillon n'apparaît nulle part. |
| **P4 — App : onglets, en-tête, états sans grille** | `/evenements/scene/[fete]`, redirection de `/evenements/scene` ; `EvenementsTabs` : la liste des trois onglets pour tout connecté (son rendu en rail et l'en-tête de la section sont de T7) ; branche scène de `SectionEvenements` sans `max-w-[1080px]` ni barre collante ; `/evenements/scene` avant `/evenements` dans `SECTIONS_EN_DEUX_VOLETS` ; en-tête de l'édition ; états `aucune`, `brouillon`, `bientot`, `fermees`, `passee` ; années passées ; ordre de passage en bas, en lecture (`?vue=ordre`) ; côté membres, `SceneClient` sans nom ni volet « Programme {nom} » (le mode `gestion`, que monte encore le Back-Office, reste jusqu'à P7 : la suite reste verte entre les deux). | Un membre voit Pâques et Noël sans aucun programme ; « ouvriront le … » d'un brouillon, sans grille ; remerciement le 28/12, Noël 2027 le 01/01. |
| **P5 — App : une semaine à la fois** | `Entrainements.tsx` en semaines (liste ou pastilles), « Mes réservations » en tête, cartes par jour, `?semaine=` ; deux volets dès `useDeuxVolets`. | Semaine par défaut, cases et « places libres », « Semaines passées » ; aucun défilement horizontal de la page ; page du téléphone bien plus courte que 7 458 px. |
| **P6 — App : réserver, déplacer, modifier, retirer** | Feuille sans rien de coché (Q15) ; menu « ⋯ » (`MenuActions`, Q14) ; feuille Déplacer en pastilles, plus de listes déroulantes ; Retirer par `useConfirmer` (`Entrainements.tsx:111`). | Écritures attendues (`POST`, `PATCH`, `DELETE`) ; aucun dialogue natif ; un autre membre n'a pas de « ⋯ ». |
| **P7 — Back-Office : l'onglet de la fête et la saison** | `/back-office/evenements/scene/[fete]`, onglets Pâques et Noël dans le layout, à la place de « Scène », après « Évènements » (la sous-partie Réunions est déjà partie avec T2a de l'agencement ; si T2a n'est pas versée, P7 l'attend : pas de rail à quatre onglets) ; colonne de la fête (menu des années, état, Cette fête, années passées, ordre de passage **modifiable** en bas) ; vue Saison : jour J, aides, aperçu d'une semaine, création à la première action (Q6), « Lancer les réservations » ; le mode `gestion` de `SceneClient` retiré avec « Nouveau programme », « Masquer », la liste des programmes (et sa confirmation `SceneClient.tsx:148`), `SaisonEcran.tsx` et `ProgrammeForm.tsx` ; `useConfirmer` pour retirer un numéro (`OrdrePassage.tsx:116`) et une réservation hors grille de l'aperçu (`Apercu.tsx:73`) : plus de `window.confirm` dans la scène. | `programmes/paques-2027` créé au premier réglage, en brouillon ; erreur `autreFete` sans écriture ; lancement en un `PATCH` ; un non-coordinateur n'a ni Pâques ni Noël au Back-Office. |
| **P8 — Back-Office : réservations et après le jour J** | Vue Toutes les réservations (tableau, filtres, « ⋯ », Déplacer hors grille, « Voir comme un membre ») ; la liste « N réservations hors grille » d'`Apercu.tsx` disparaît (Q20) ; état `passee` : carte, « Préparer {fête} {année + 1} », ordre en lecture et « Imprimer » ; années passées par `?annee=`. | `noel-2027` reprend plages, durée, familles et l'écart d'ouverture ; ordre non modifiable après le jour J. |
| **P9 — Back-Office sur téléphone** | Saison en résumé, une feuille par réglage ; « Lancer » pleine largeur ; « Cette semaine » en cartes par jour. | Chaque ligne ouvre sa feuille ; une erreur s'affiche dans la feuille, rien n'est écrit. |

Points de contrôle : après P3 (règle et lecteurs, aucun écran cassé), après P6 (l'App entière), après P9
(captures regardées aux cinq tailles, relecture).

## Tests (Playwright, écrits avant le code)

Nouveau fichier `tests/scene-paques-noel.spec.ts`, ajouté à `SPECS_GRAND_ECRAN`
(`playwright.config.ts:16`) : il tourne sur **ordinateur, téléphone, tablette, tablette-paysage et
ordinateur-1440**. Chaque test est vu rouge avant sa tranche. Un test propre à un appareil le dit dans
son titre. Horloge simulée (`page.clock.setFixedTime`), Firestore simulé comme dans
`tests/scene-saison.spec.ts`, prénoms fictifs. Sur `/evenements/scene/noel` et
`/back-office/evenements/scene/noel`, chaque test d'écran appelle aussi les vérifications communes de
`tests/helpers/agencement.ts` (F1 de l'agencement : un seul h1 au même x, halo, pas de défilement en largeur,
aucune fenêtre native, `data-onglets` du rail et des pilules).

**Règle (fonctions pures, P1-P2)**
- `paques` : 2025-04-20, 2026-04-05, 2027-03-28, 2028-04-16 ; `jourJParDefaut("noel", 2026)` = 2026-12-24.
- `feteDe` : champ présent → lui ; ancien document au 24/12/2026 → Noël 2026 ; au 04/04/2027 → Pâques
  2027 ; au 14/06/2026 → aucune fête. Deux documents pour Noël 2026 → `noel-2026` gagne.
- `editionCourante("noel")` : 09/10/2026 → 2026 ; 28/12/2026 → 2026 ; 01/01/2027 → 2027 ; jour J
  avancé au 20/12 → 2027 dès le 28/12. `editionCourante("paques")` au 09/10/2026 → 2027.
- `etatEdition` : les six états, chacun sur sa date ; document sans `ouvert` → lancé.
- `reglagesRepris` : depuis Noël 2026 (ouverture 01/10, sam. 10–12 et dim. 14–19, 1 h, quatre
  familles) → Noël 2027 ouvert le 01/10/2027, mêmes plages, `ouvert: false`, ordre vide ; sans
  précédent → Pâques 2027 ouvert le lundi 01/02/2027, dimanche 14:00–19:00.
- `editionsAffichees` : un brouillon et une fête sans document n'y sont pas.
- `lignesDuJour` : 17:00–18:30 dans une grille d'1 h → une seule ligne, `couvre` = 2, aucune ligne à
  18:00 ; une réservation pile sur un créneau → `couvre` = 1.
- `semainesDe` : samedi et dimanche du 01/10 au 20/12/2026 → 12 semaines, la première « 3 – 4 oct. » ;
  cases et places libres ; une semaine pleine → « complet ».
- `erreursSaison` : Pâques 2027 ouvert le 01/12/2026 alors que Noël 2026 ferme le 20/12 → `autreFete` ;
  ouvert le 01/02/2027 → aucune erreur.

**Lecteurs (P3)**
- Calendrier : créneaux de Noël 2026 et de Pâques 2027 (lancé) dans la même lecture, lien vers leur
  fête ; un brouillon n'y est pas.
- Widget : sans réglage, l'édition au jour J le plus proche ; son titre porte « Noël 2026 ».

**App (P4-P6)**
- Rail « Calendrier · Pâques · Noël » pour un membre sans aucun programme ; 复活节 et 圣诞节 en chinois.
- `/evenements/scene` → `/evenements/scene/noel` le 09/10/2026 ; `/evenements/scene/ete` → 404.
- Pâques sans document : « … ne sont pas encore ouvertes » ; brouillon ouvert au 01/02 : « Les
  réservations ouvriront le lundi 1er février », aucun bouton « Réserver ».
- Noël 2026 ancien document : titre « Noël 2026 », « Mes réservations » en tête avec le compte ;
  semaine du 10 au 11 octobre par défaut ; ‹ › et la liste changent de semaine et l'adresse
  (`?semaine=`) sans entrée d'historique.
- Hors grille : une ligne « 17:00 → 18:30 », « prend aussi le créneau de 18:00 », pas de « Pris ».
- Réserver : aucune pastille cochée, bouton inactif « Choisis quoi et qui » ; après Quoi et Qui, le
  `POST` porte le jour, le créneau et l'auteur.
- « ⋯ » : Déplacer liste les créneaux libres en pastilles (aucun `select`) et écrit le nouveau
  créneau ; Retirer ouvre la confirmation de l'app, `DELETE` après « Retirer » ; un `page.on("dialog")`
  fait échouer le test s'il se déclenche.
- Un autre membre ne voit ni « ⋯ » ni « à moi » sur ma réservation ; la coordination voit « ⋯ » partout.
- Ordre de passage : une seule entrée « Ordre de passage du jour J », en bas ; en lecture même pour la
  coordination (aucune poignée) ; plus de volet « Programme Noël ».
- 28/12/2026 : remerciement ; 01/01/2027 : Noël 2027 « … ne sont pas encore ouvertes ».
- App, et Back-Office une fois P7 versée : aucun libellé « Nouveau programme », « Masquer », « Afficher »,
  « Modifier le programme », « Fermer ».
- Partout : `document.documentElement.scrollWidth ≤ innerWidth` ; deux volets sur ordinateur,
  ordinateur-1440 et tablette-paysage, une colonne sur téléphone et tablette.

**Back-Office (P7-P9)**
- Coordination : rail « Évènements · Pâques · Noël » (pas de Réunions : entrée à part du menu) ; un membre avec un droit d'annonces
  mais hors coordination n'a ni Pâques ni Noël.
- Pâques sans document : vue Saison, jour J 28/03/2027, ouverture 01/02/2027 ; ouvrir l'onglet n'écrit
  rien ; changer la durée → `POST programmes?documentId=paques-2027` avec `fete`, `annee`,
  `ouvert: false` ; un 409 relit puis écrit le changement en `PATCH`.
- Erreur `autreFete` sous « Réservations », aucune écriture ; « Lancer les réservations » inactif.
- « Lancer les réservations » → un `PATCH` de `ouvert` seul ; un membre voit alors la grille (horloge
  après l'ouverture).
- Toutes les réservations : filtres et comptes, ligne hors grille avec « Déplacer » ; « Voir comme un
  membre » mène à `/evenements/scene/noel`.
- 28/12/2026 : carte « Noël 2026 est passé », « Préparer Noël 2027 » → `POST` de `noel-2027` avec les
  réglages repris, puis vue Saison de 2027 ; le menu du titre liste Noël 2027 et Noël 2026.
- Ordre de passage : glisser-déposer jusqu'au 24/12 compris ; le 25/12, lecture et « Imprimer ».
- Téléphone : chaque ligne du résumé ouvre sa feuille (test propre au téléphone, dit dans son titre) ; tablette
  portrait : la carte entière.

**Non-régression**
- `tests/scene-saison.spec.ts`, `tests/programme-scene.spec.ts`, `tests/evenements.spec.ts` réécrits
  là où ils parlent du nom, de Masquer, de la liste des programmes, de l'écran de saison à part, des
  lignes « Pris » ou des deux boutons sous une réservation ; chevauchement refusé à la relecture,
  course perdue (`/api/scene/conflit`), droits et règle des créneaux inchangés.
- `tests/calendrier*.spec.ts` (dont `calendrier-deplacer.spec.ts`, qui déplace un créneau de scène) et
  `tests/tableau-de-bord.spec.ts` (le widget) : lien et lecture par fête ; `tests/back-office-admin.spec.ts`
  et `tests/pages-en-grand-evenements.spec.ts` là où ils attendent l'onglet « Scène » ou le nom du programme.
- `tests/back-office-coupe.spec.ts` : `/evenements/scene/noel` et `/back-office/evenements/scene/paques`
  répondent 404 sans l'interrupteur.
- Captures regardées à l'œil aux cinq tailles, membres et coordination, FR et 中文.

## Hors périmètre

- **Toujours** : chevauchement refusé ; aucune validation des demandes ; rappels fondus dans le rappel
  du matin ; rien sans compte ; derrière l'interrupteur jusqu'à la mise en ligne du Back-Office ; aucune
  couleur nouvelle (`PLANNING_COLORS.scene`).
- **Demander avant** : une troisième fête ou un programme hors Pâques et Noël ; repasser une saison
  lancée en brouillon ; supprimer une édition depuis l'app ; un état « publié » de l'ordre de passage ;
  la grille horaire de deux semaines (piste B, écartée) ; un compteur de créneaux par groupe ; prendre
  plusieurs créneaux d'un coup.
- **Jamais** : supprimer une réservation automatiquement ; migrer ou réécrire un ancien programme ;
  une notification de plus.

## À la mise en ligne

- Aucune règle à publier pour ce lot (droits inchangés). Si la règle des créneaux de U1 (`reservable()`)
  n'est pas encore publiée, elle l'est avant.
- L'ancien programme de Noël est lu comme Noël 2026 (Q2) ; s'il n'existe pas en base, Noël 2026 naît à
  la première action d'Alice. Alice vérifie la saison de Noël 2026 puis la lance, si ce n'est déjà fait.
- Timothée relit le 中文.

## Questions ouvertes

Aucune : la planche version 18 est validée en entier (06/10/2026) ; les points que la planche ne
tranchait pas sont décidés plus haut avec leur raison (Q2, Q7, Q8, Q16).

## Commandes

```bash
npm test -- tests/scene-paques-noel.spec.ts tests/scene-saison.spec.ts tests/programme-scene.spec.ts tests/evenements.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npm test -- tests/back-office-coupe.spec.ts
npx tsc --noEmit
npm run lint
```

## Avancement

- 06/10/2026 : spec écrite d'après la planche version 18 (rangée R17, piste A) validée le soir même ;
  rien n'est codé ; **attend le go**.
- 06/10/2026, plus tard : relecture croisée avec `spec-agencement-v18.md` (en-tête et composants communs repris
  de F1, F2, T2 et T7 ; ordre P4 après T7, P7 après T2a et T2b) ; Réunions sort du rail du Back-Office (entrée à
  part, T2a de l'agencement). Attend toujours le go.

### SCENE

- 06/10/2026 — **P1 — La règle des fêtes : faite** (branche `lot/v18-scene`, commit « feat(SCENE): P1 »).
  `src/lib/scene/fetes.ts` (`FETES`, `Fete`, `paques`, `jourJParDefaut`, `idEdition`, `feteDe`, `anneeDe`,
  `editionsDe`, `editionCourante`, `etatEdition`, `editionsAffichees`, `reglagesRepris`, `libelleEdition`) ;
  `fete` et `annee` dans `Programme` (`src/types/programme.ts`) et lus par `fromFsProgramme`
  (`src/lib/firebase/programmes.ts`) ; `tests/scene-paques-noel.spec.ts` (20 tests de la règle) ajouté à
  `SPECS_GRAND_ECRAN` : vu rouge (module absent, puis contre-épreuve : 9 tests rouges sur une règle
  sabotée), vert sur les cinq projets (100) ; `tsc` et `lint` propres. Aucun écran ne change.
  - Choix faits faute de réponse : `nom` d'une édition nouvelle = son titre français (« Noël 2027 ») ;
    `visible` reste dans le type tant que `currentProgramme` (P3) et `SceneClient` (P7) le lisent ;
    `etatEdition` rend `passee` pour toute date après le jour J (une année passée aussi) ; deux documents
    non canoniques pour la même édition : le premier lu (ordre de `listProgrammes`, jour J croissant) gagne.
  - Reste : P2 à P9.
  - À faire par Timothée : rien pour P1 (aucune règle à publier, droits inchangés).
- 06/10/2026 — **P2 — La grille : faite** (branche `lot/v18-scene`, commit « feat(SCENE): P2 »).
  `src/lib/scene/saison.ts` : `lignesDuJour` sans type `pris` (une réservation absorbe les créneaux qu'elle
  chevauche et porte `couvre` et `aussi`, les heures des créneaux pris en plus), `semainesDe` (semaines du
  lundi au dimanche, une case par créneau, `libres`), `compteCreneaux` (créneaux par jour de la semaine,
  semaines, total), erreur `autreFete` dans `erreursSaison(saison, jourJ, autre?)` ;
  `src/app/evenements/scene/LigneJour.tsx` rend une réservation hors grille sur une ligne de la hauteur des
  créneaux couverts (« 17:00 → 18:30 », « 17:00 – 18:30 · prend aussi le créneau de 18:00 ») ;
  `semaineCourte` (« 3 – 4 oct. », « 10月3日 – 4日 ») dans `libelles.ts` ; libellé `planning.saison.pris`
  remplacé par `prendAussi` (FR et 中文). Tests : 8 nouveaux dans `tests/scene-paques-noel.spec.ts`, 2
  repris dans `tests/scene-saison.spec.ts` (plus de « Pris » sur la page actuelle) : vus rouges sur le code
  de P1 (10 rouges), verts ensuite ; `tsc` et `lint` propres.
  - Choix faits faute de réponse : une réservation un jour sans grille (mardi) a `couvre` = 0 et ne compte
    dans aucune semaine ; `compteCreneaux` compte les créneaux de la grille, hors jour J ; `semaineCourte`
    écrit « 1er » le premier du mois.
  - Reste : P3 à P9.
  - À faire par Timothée : rien pour P2 (aucune règle à publier, droits inchangés) ; relire le 中文
    « 同时占用 {{heures}} 的时段 ».
- 06/10/2026 — **P3 — Les lecteurs : faite** (branche `lot/v18-scene`, commit « feat(SCENE): P3 »).
  `editionProche(editions, today)` dans `fetes.ts` (le jour J le plus près, avant ou après) ;
  `creerEdition(fete, annee, data, changement)` dans `src/lib/firebase/programmes.ts` (`POST
  programmes?documentId={fete}-{annee}`, sans `visible` ; sur 409, seul `changement` s'écrit en `PATCH`
  sur le document existant) ; cron des rappels (`sceneCreneaux` : les créneaux de chaque édition
  affichée), calendrier (`DonneesCalendrier.scene` = tableau d'éditions, `charger.ts` ; `entrees.ts` :
  un brouillon écarté, lien `/evenements/scene/{fete}` ; `deplacer.ts` : l'édition qui porte le créneau,
  sa grille et son programme), widget Scène (choisi parmi les éditions affichées, sinon `editionProche` ;
  titre « Scène · Noël 2026 ») et ses réglages (les éditions affichées, titre calculé) passent à
  `editionsAffichees`. `currentProgramme` retiré de `dimanches.ts` avec ses tests (`programme-scene.spec.ts`,
  `scene-saison.spec.ts`). Dans `programme-scene.spec.ts`, les trois tests de l'épinglage (« Masquer »,
  « Afficher ») sont retirés (Q11) ; trois autres, qui comptaient sur un programme lancé caché avant son
  ouverture, posent désormais un brouillon. Tests : 9 nouveaux dans `tests/scene-paques-noel.spec.ts` (vus rouges, verts),
  `tests/helpers/cleFirebase.ts` (clé factice pour importer les modules REST dans un test Node) ;
  `calendrier.spec.ts`, `calendrier-deplacer.spec.ts`, `evenements-2027.spec.ts`, `tableau-de-bord.spec.ts`
  suivent la nouvelle forme ; `tsc` et `lint` propres.
  - Choix faits faute de réponse : la page (`SceneClient`) et l'onglet (`EvenementsTabs`), autres
    appelants de `currentProgramme`, montrent en attendant P4 l'édition affichée au jour J le plus proche
    (`editionsAffichees` puis `editionProche`) : l'épinglage (`visible`, « Afficher ») n'a plus d'effet
    (Q11) et une édition lancée avant son ouverture (`bientot`) s'affiche ; `creerEdition` prend un
    quatrième argument `changement` (ce qui s'applique sur 409) ; le réglage par défaut du widget garde
    son libellé « Celui qui est affiché » ; les clés des entrées du calendrier restent
    `scene:{créneau}:{date}` (l'édition se retrouve par l'identifiant du créneau).
  - Entre P3 et P4, le lien du calendrier `/evenements/scene/noel` répond 404 (la route vient avec P4).
  - Reste : P4 à P9 ; `creerEdition` n'a pas encore d'écran (P7, Q6), et le Firestore simulé des tests
    (`fakeSession.ts`) ne connaît pas encore `documentId` ni le 409.
  - À faire par Timothée : rien pour P3 (aucune règle à publier, droits inchangés).
- 07/10/2026 — **P4 — App : onglets, en-tête, états sans grille : faite** (branche `lot/v18-scene`, commit
  « feat(SCENE): P4 », après la fusion de `lot/v18-fondations`, F1 et F2). Sans attendre T7 (accélération voulue
  par Timothée) : `SectionEvenements.tsx` pose, sous `/evenements/scene`, l'en-tête de la section avec les
  composants de F1 (`EnTetePage` titre « Évènements », sous-titre de A10, `OngletsRail` Calendrier · Pâques ·
  Noël) et le halo de la scène, sans barre collante ni `max-w-[1080px]` ; l'agenda (`CalendrierClient`) n'est pas
  touché. `EvenementsTabs.tsx` : `useOngletsEvenements()` rend la liste des trois onglets pour tout connecté
  (lue par le rail et par les pilules de l'agenda), plus de lecture des programmes. `/evenements/scene/[fete]`
  (`paques`, `noel`, sinon 404) monte `FeteClient.tsx` : en-tête de l'édition (titre calculé, jour J, fin des
  réservations), cartes des états `aucune`, `brouillon`, `bientot`, `fermees`, `passee`, « Les années passées »
  (`?annee=`), « Comment réserver ? », ordre de passage en lecture (`OrdrePassage` sans `canEdit`, `?vue=ordre`,
  en page avec `Retour` sur téléphone ; entrée en bas de la colonne en deux volets, carte tout en bas en une
  colonne) ; deux volets par `DeuxVolets` (liste-carte de 400 px). `/evenements/scene` → `VersLaFete.tsx`
  (la fête au jour J le plus proche, `router.replace`). `/evenements/scene` avant `/evenements` dans
  `SECTIONS_EN_DEUX_VOLETS`. Libellés `planning.fete.*`, `evenements.tabs.{paques,noel}`, `evenements.sousTitre`
  (FR et 中文). `SceneClient` n'est plus monté côté membres (le Back-Office le garde en mode `gestion` jusqu'à P7).
  - Tests : 14 tests P4 dans `tests/scene-paques-noel.spec.ts` (dont un propre au téléphone et un propre au
    téléphone et à la tablette debout, plus une capture sous `PW_CAPTURES`), vus rouges sur le code de P3
    (11 rouges sur `ordinateur`, puis 2 rouges pour l'ordre en bas sur téléphone et tablette), verts sur les
    cinq projets ; `/evenements/scene/noel` ajouté à `tests/back-office-coupe.spec.ts` ; réécrits là où ils
    parlaient du nom en onglet, de « Aucun programme en cours. », du volet « Programme Noël » ou de « Réservations :
    du … au … » : 7 tests de `programme-scene.spec.ts`, 8 de `scene-saison.spec.ts`. `evenements.spec.ts`,
    `pages-en-grand-evenements.spec.ts`, `calendrier.spec.ts`, `calendrier-deplacer.spec.ts`,
    `back-office-admin.spec.ts` verts, sauf `pages-en-grand-evenements.spec.ts:79` (`ordinateur`,
    `tablette-paysage`), rouge attendu de F1 que T7 réécrit (voir `spec-agencement-v18.md`). `tsc` et `lint` propres.
  - Choix faits faute de réponse : sur téléphone, l'année passée se choisit dans la même liste « Les années
    passées » que sur ordinateur (la planche montre « L'an dernier » et un lien vers l'année d'avant) ; le
    remerciement garde `planning.scene.passed` avec le titre calculé (« Noël 2026, c'est passé — merci à tous ! ») ;
    plus de ligne « Prochain programme » (chaque fête a son onglet) ; un brouillon dont l'ouverture prévue est déjà
    passée annonce quand même « ouvriront le … » (cas que la spec ne tranche pas) ; « Gérer dans le Back-Office »
    mène encore à `/back-office/evenements/scene` (l'onglet de la fête au Back-Office vient avec P7).
  - Fusion avec T7 : T7 posera aussi l'en-tête de l'agenda ; garder la branche `SectionScene` de
    `SectionEvenements.tsx` (ou la fondre dans l'en-tête commun de T7) et `useOngletsEvenements`.
  - Reste : P5 à P9 (la grille reste celle de U1 en jours, jusqu'à P5).
  - À faire par Timothée : rien pour P4 (aucune règle à publier, droits inchangés) ; relire le 中文 des clés
    `planning.fete.*` et `evenements.sousTitre`.
- 07/10/2026 — **P5 — App : une semaine à la fois : faite** (branche `lot/v18-scene`, commit « feat(SCENE): P5 »).
  `Entrainements.tsx` rangé en semaines (Q12, Q14) : « Mes réservations » (mes réservations à venir, compte,
  tuile de date ; toucher une ligne choisit sa semaine et descend à son jour ; masqué sans réservation), la liste
  « Entraînements » des semaines (`semainesDe` : jours, « N places libres » ou « complet », une case par créneau,
  pleine = pris), « Semaines passées (n) » qui déplie les passées, et la semaine choisie en cartes par jour (tuile,
  « Samedi 10 octobre », places libres du jour, lignes de `LigneJour`). Deux volets (`useDeuxVolets`) : la liste à
  gauche dans la colonne de la fête, à droite « Semaine du 10 au 11 octobre », « 3 places libres · un créneau = 1 h »,
  ‹ › ; une colonne : les semaines en pastilles dans une bande qui défile seule en largeur (la pastille choisie s'y
  montre), les jours dessous, l'ordre de passage en carte tout en bas. `?semaine=` (le lundi) remplace l'adresse
  sans entrée d'historique ; par défaut la première semaine qui a un jour réservable à partir d'aujourd'hui.
  `Entrainements` rend trois morceaux (`children`), posés par `FeteClient` ; `SceneClient` (Back-Office jusqu'à P7)
  les empile. Libellés `planning.semaines.*` (FR et 中文) ; `libelles.ts` : `jourCourt`, `tuileDate`,
  `joursCourts`, `bornesSemaine`.
  - Tests : 10 tests P5 dans `tests/scene-paques-noel.spec.ts` (dont un propre aux grands écrans, un propre au
    téléphone et à la tablette debout, une capture sous `PW_CAPTURES`), vus rouges (16 sur `ordinateur` et
    `telephone`), verts sur les cinq projets ; téléphone : la page mesure moins de 3 000 px (7 458 à l'audit).
    Réécrits pour la semaine choisie : 4 tests de `scene-saison.spec.ts` (jours lointains, « Semaines passées (1) »,
    中文 « 过去的周（1） »), 4 de `programme-scene.spec.ts`. `tsc` et `lint` propres.
  - Choix faits faute de réponse : sur une colonne, ni titre de semaine ni ‹ › (les pastilles en tiennent lieu,
    planche téléphone) ; le bouton « Semaines passées (n) » garde son libellé déplié (`aria-expanded`) ; une semaine
    passée choisie par l'adresse déplie les passées ; un jour qui n'a qu'une réservation hors des jours de la saison
    entre dans sa semaine (créée sans case s'il le faut : rien ne disparaît) ; « places libres » d'un jour ne compte
    pas les créneaux déjà commencés, et ne s'affiche pas pour un jour passé ; « Mes réservations » = mes
    réservations à venir (aujourd'hui compris tant qu'elles ne sont pas finies), y compris pour la coordination.
    Restent pour P6, comme le dit la spec : « ⋯ » (les boutons Modifier et Retirer sont encore sous la
    réservation), la pastille « à moi », la feuille sans rien de coché, Déplacer en pastilles, `useConfirmer`.
  - Captures : prises en pleine page, la tablette couchée y passe en une colonne (Chromium agrandit la fenêtre
    pour la pleine page et la fenêtre devient « portrait ») ; le test des deux volets le vérifie sans capture.
  - Reste : P6 à P9.
  - À faire par Timothée : rien pour P5 (aucune règle à publier, droits inchangés) ; relire le 中文 de
    `planning.semaines.*` (« 我的预约 », « 周次 », « 过去的周（n） », « 剩余 n 个名额 », « 已满 », « 每个时段 … »,
    « …至…这一周 », « 上一周 », « 下一周 »).
- 07/10/2026 — **P6 — App : réserver, déplacer, modifier, retirer : faite** (branche `lot/v18-scene`, commit
  « feat(SCENE): P6 »). `CreneauForm.tsx` : feuille « Réserver » sans rien de coché (Q15), bouton plein gris et
  inactif « Choisis quoi et qui » tant que Quoi ou Qui manque, puis « Réserver » ; « Note · facultatif » ; neuf
  groupes puis « + N » qui déplie le reste (déplié d'emblée si un groupe déjà choisi est au-delà) ; « Déplacer »
  ne propose que les créneaux libres, en pastilles groupées par jour (le sien compris s'il est dans la grille),
  plus aucune liste déroulante, et ne touche ni quoi ni qui ; « Modifier » rappelle le créneau en tête et ne
  change que Quoi, Qui, Note. `Entrainements.tsx` : « ⋯ » (`MenuActions` de F1) sur chaque réservation que je
  peux changer (`canEditCreneau`, inchangé), dans la semaine et dans « Mes réservations » : Déplacer, Modifier,
  Retirer ; Retirer passe par `useConfirmer` (« Retirer ce créneau ? » — « Sketch · Jeunes, dimanche 11
  octobre · 16:00 – 17:00 : le créneau redevient libre. »), plus de `window.confirm` côté membres ; les deux
  boutons sous la réservation disparaissent ; « à moi » (pastille à l'encre) remplace mon nom. Libellés FR et
  中文 : `planning.saison.{choisisQuoiQui,autresGroupes,facultatif}`, `planning.semaines.{aMoi,retirerTexte}` ;
  `planning.programme.noteHint` devient « Sono, matériel, précision… » ; `planning.saison.creneau`, orpheline, retirée.
  - Tests : 9 tests P6 dans `tests/scene-paques-noel.spec.ts` (plus une capture sous `PW_CAPTURES`), vus rouges
    sur le code de P5 (9 rouges sur `ordinateur`), verts ensuite ; réécrits pour « ⋯ », « à moi », « + N » et
    les pastilles : 10 tests de `scene-saison.spec.ts` (dont les deux « Déplacer » hors grille de l'aperçu, qui
    partagent la feuille), 3 de `programme-scene.spec.ts`, 1 de P5 (`Mes réservations` lue par ligne). `tsc` et
    `lint` propres.
  - Repris après une coupure : le travail non commité a été relu, gardé, revu rouge (contre-épreuve sur le code
    de P5 : les 9 tests P6 rouges) puis vert sur les cinq projets (P5 et P6 : 85 verts ; `scene-saison` et
    `programme-scene` : 309 verts). Corrigé en passant : deux « ‹ » touchés vite ne reculaient que d'une
    semaine (la semaine se lisait dans l'adresse, que `router.replace` met à jour plus tard ; le test P5
    « changer de semaine » tombait sur `ordinateur`) : la semaine demandée gagne désormais jusqu'à ce que
    l'adresse la rattrape (`Entrainements.tsx`).
  - Choix faits faute de réponse : le menu « ⋯ » n'a que les libellés (la planche ajoute une ligne d'aide sous
    chacun ; `MenuActions` de F1 n'en a pas, et la scène n'en écrit pas d'autre) ; son nom accessible est
    « Plus d'actions · {quoi} · {qui} » ; une réservation hors grille qu'on déplace n'a aucune pastille choisie
    au départ (bouton inactif jusqu'au choix) ; le bouton plein de « Déplacer » dit « Déplacer » ; l'aperçu du
    Back-Office (`Apercu.tsx`) reçoit les mêmes pastilles pour son « Déplacer », son `window.confirm` reste
    jusqu'à P7 comme prévu.
  - Reste : P7 à P9.
  - À faire par Timothée : rien pour P6 (aucune règle à publier, droits inchangés) ; relire le 中文 « 请选择内容和参与者 »,
    « 其他团体 », « 可选 », « 我的 », « {{resa}}，{{jour}} · {{debut}} – {{fin}}：该时段将重新空出。 ».

### SCENEBO

- 07/10/2026 — **P7 — Back-Office : l'onglet de la fête et la saison : faite** (branche `lot/v18-scene-bo`, partie de
  `ui/apple-design` après la fusion de `lot/v18-scene` (P1-P6) et de `lot/v18-t2` (T2a, T2b) ; commit « feat(SCENE): P7 »).
  Rail du Back-Office « Évènements · Pâques · Noël » (`back-office/evenements/layout.tsx` : la sous-partie `scene` donne
  les deux onglets, halo de la scène) ; `/back-office/evenements/scene` → la fête au jour J le plus proche (`VersLaFete`
  prend `base`) ; `/back-office/evenements/scene/[fete]` (`paques`, `noel`, sinon 404 : `dynamicParams = false`) monte
  `FeteGestion.tsx` : colonne « Cette fête » (titre de l'édition avec le menu des années, pastille d'état, entrée
  Saison avec son résumé, phrase de ce que voient les membres et « Les années passées » avant le lancement, ordre de
  passage en bas) ; à droite la vue Saison (« Saison de Pâques 2027 », « Enregistré à chaque changement … »,
  « Lancer les réservations » en un `PATCH` de `ouvert`, inactif tant qu'une erreur s'affiche, puis « Réservations
  lancées ») ou l'ordre de passage (`?vue=ordre`, modifiable jusqu'au jour J compris). Une édition sans document se
  montre avec `reglagesRepris` et naît à la première action (`creerEdition`, `POST ?documentId=`, 409 → `PATCH`) ;
  ouvrir l'onglet n'écrit rien. `SaisonForm` : Jour J en tête (« Calculé pour Pâques ; modifiable. », écrit seul),
  aides (premier jour réservable, fin, créneaux par jour), erreur `autreFete` sous « Réservations » ; libellés de la
  planche (Réservations, Jours, Plages, Un créneau dure). `Apercu` : « Aperçu des membres » sur une semaine (‹ ›), le
  premier jour en lignes, les autres jours et le total en une phrase ; « Retirer » hors grille par `useConfirmer`.
  `OrdrePassage` : retirer un numéro par `useConfirmer` — plus de `window.confirm` dans la scène. Retirés :
  `SceneClient.tsx` (mode `gestion`, « Nouveau programme », « Masquer », liste des programmes), `SaisonEcran.tsx`,
  `ProgrammeForm.tsx`, et `createProgramme`, `deleteProgramme` (`programmes.ts`) restés sans appelant. « Gérer dans le
  Back-Office » (App) mène à l'onglet de la même fête. Libellés `planning.gestion.*`,
  `planning.saison.erreurs.autreFete` (FR et 中文). Firestore simulé des tests : `?documentId=` et 409
  (`tests/helpers/fakeSession.ts`).
  - Tests : 15 tests P7 dans `tests/scene-paques-noel.spec.ts` (plus une capture sous `PW_CAPTURES`), vus rouges
    (15 sur `ordinateur`), verts sur les cinq projets. Réécrits pour l'onglet de la fête : la partie « écran de la
    coordination » de `scene-saison.spec.ts` (plus de « Préparer la saison », « Modifier la saison », « Ouvrir les
    réservations », « Programme du jour J », « Modifier le programme », « Créer le programme » ; aperçu en semaines ;
    confirmation du site) ; dans `programme-scene.spec.ts`, la création (premier réglage puis « Lancer »), l'ordre de
    passage au Back-Office, les sept jours et l'archivage ; supprimés : « modifie le programme en place », « choisi
    automatiquement », « créer un programme ne vole plus l'onglet ». Rail « Évènements · Pâques · Noël » dans
    `agencement-v18-t2a.spec.ts`, `agencement-v18-t2b.spec.ts`, `back-office-admin.spec.ts` ;
    `/back-office/evenements/scene/paques` dans `back-office-coupe.spec.ts`. `tsc` propre, `lint` sans nouvel avertissement.
    Passes : `scene-paques-noel`, `scene-saison`, `programme-scene` sur tous leurs projets (714 verts ; le glissé de
    l'ordre de passage sur téléphone amène d'abord la ligne au milieu de l'écran, loin de la barre du bas) ;
    `agencement-v18-t2a`, `agencement-v18-t2b`, `back-office-admin` sur `ordinateur` (186 verts) ; `back-office-coupe`
    (64 verts). Captures regardées aux cinq tailles (sous 1 440 px, l'aperçu passe sous la carte de la saison).
  - Choix faits faute de réponse : « Entraînements » (les semaines) et « Toutes les réservations » ne sont pas dans la
    colonne du Back-Office à P7 : ils viennent avec P8 (vue Toutes les réservations), comme la vue par défaut
    « Toutes les réservations » des états lancés ; d'ici là, la vue Saison est montrée par défaut sauf après le jour J
    (l'ordre de passage) et la coordination gère toute réservation depuis l'App (« ⋯ » partout) et la liste hors grille
    de l'aperçu. « Les années passées » disent jour J et nombre de numéros, sans le nombre de réservations de la
    planche (il faudrait lire les créneaux de chaque année). Une fête sans document porte la pastille « Brouillon ».
    L'autre fête comparée par `autreFete` est son édition courante (brouillon compris). Le menu des années liste
    l'édition courante et toutes les éditions de la fête, la plus récente d'abord ; choisir l'année courante retire
    `?annee=`. Sur une colonne (téléphone, tablette debout), la colonne puis la vue choisie, en entier (le résumé et
    les feuilles du téléphone sont P9).
  - Reste : P8 (Toutes les réservations, Entraînements dans la colonne, après le jour J et « Préparer … », « Imprimer »)
    et P9 (téléphone). Clés devenues orphelines, laissées pour éviter des conflits de fusion :
    `planning.saison.{label,titre,programmeJourJ,ouvrir,ouvertes,fermer,apercu,precedent,suivant,resume,modifierSaison,preparerSaison}`,
    `planning.programmes.*` (sauf `jourJLabel`, `error`), `planning.scene.{noCurrent,others,editProgramme,newProgramme,nextSoon,willArchive,autoChosen,viewOrdre,hideOrdre}`,
    `backOffice.parties.scene`.
  - À faire par Timothée : rien à publier (droits inchangés) ; relire le 中文 de `planning.gestion.*` (« 预约季 »,
    « 启动预约 », « 预约已启动 », « 本次节日 », « 按{{fete}}日期计算；可修改。 », « 成员看到的预览 »…) et
    `planning.saison.erreurs.autreFete`, `planning.saison.periode` (« 预约时间 »).
- 07/10/2026 — **P8 — Back-Office : réservations et après le jour J : faite** (branche `lot/v18-scene-bo`, commit
  « feat(SCENE): P8 »). `FeteGestion.tsx` : une fois lancée, la colonne porte « Toutes les réservations » (« 4 à venir · 1 hors
  grille » ; « Réservations · après le lancement », inactif, avant le lancement ; « 38 réservations, 0 hors grille » après le
  jour J) et, jusqu'au jour J, « Entraînements » (les semaines des membres, montées par `Entrainements`) ; vue par défaut :
  Toutes les réservations (`bientot`, `ouvertes`, `fermees`), la saison avant le lancement, l'ordre de passage après le
  jour J ; toucher une semaine l'ouvre à droite (`?semaine=`, qui retire `?vue=`), avec « ⋯ » sur toutes les réservations.
  Nouveau `ToutesReservations.tsx` : tableau Jour · Créneau · Quoi · Qui · Réservé par · « ⋯ », un jour par groupe de lignes,
  pilules `Pilules` « À venir n · Passées n · Hors grille n », ligne hors grille surlignée (`data-hors-grille`) avec
  « Déplacer » à la place de « ⋯ », « Voir comme un membre » vers `/evenements/scene/{fete}` (`?annee=` pour une autre
  année). Le menu « ⋯ », la feuille Déplacer et la confirmation sont ceux de P6 : `Entrainements` les passe dans ses
  morceaux (`menu`, `deplacer`, `erreur`) ; un retrait manqué s'y dit (« Enregistrement impossible… ») ; prop
  `semaineActive` (aucune semaine marquée tant que la semaine n'est pas ce qui se lit). `Apercu.tsx` perd sa liste
  « N réservations hors grille » et sa feuille (Q20). Après le jour J (Q21) : carte « Noël 2026 est passé » (remerciement
  jusqu'à J + 7, puis l'année suivante) et « Préparer Noël 2027 » (`creerEdition` avec `reglagesRepris`, puis
  `?annee=2027&vue=saison` ; plus de bouton si l'édition suivante existe) ; ordre de passage en lecture dès le lendemain du
  jour J, avec « Imprimer » (`window.print()` ; `globals.css` : à l'impression, `.scene-imprimer` seule). Libellés
  `planning.gestion.{reservations,apresLancement,toutes,toutesSousTitre,voirCommeMembre,filtrer,filtres.*,colonnes.*,
  aucuneReservation,resume,nReservations,bilan,passeeTitre,passeeTexte,preparer,imprimer}` (FR et 中文).
  - Tests : 13 tests P8 dans `tests/scene-paques-noel.spec.ts` (plus une capture sous `PW_CAPTURES`), vus rouges (13 sur
    `ordinateur`), verts ensuite. Réécrits : P7 « Noël 2026 ancien document » (la saison est à un toucher) ; dans
    `scene-saison.spec.ts`, les tests hors grille passent par « Toutes les réservations » (filtre, « Déplacer ») ou par
    « ⋯ » de la semaine (Retirer), ceux de la saison lancée ouvrent `?vue=saison`, « Retirer qui échoue » se lit au-dessus
    du tableau. `tsc` et `lint` propres. Passe : `scene-paques-noel`, `scene-saison`, `programme-scene` sur les cinq projets (784 verts).
  - Choix faits faute de réponse : « Hors grille » compte les réservations hors grille **à venir** (les seules qu'on puisse
    déplacer ; une passée reste dans « Passées », sans surlignage) ; une ligne hors grille n'a que « Déplacer » (planche),
    on la retire par « ⋯ » dans sa semaine ; les passées se lisent dans l'ordre chronologique ; « Lancer les réservations »
    garde la vue Saison (« Réservations lancées ») au lieu de basculer sur le tableau ; la carte « … est passé » ne
    s'affiche que pour l'édition courante (une année plus ancienne choisie par `?annee=` montre son ordre en lecture et
    « Imprimer », sans « Préparer ») ; après le jour J, plus d'« Entraînements » dans la colonne (planche « après ») ; pas de
    « Mes réservations » au Back-Office ; la ligne hors grille est surlignée en gris (`bg-secondary`), pas en orange :
    aucune couleur nouvelle ; « Imprimer » imprime aussi le titre et la date de l'ordre de passage.
  - Reste : P9 (téléphone : saison en résumé, une feuille par réglage, « Lancer » pleine largeur, « Cette semaine » en cartes
    par jour). Sur téléphone, le tableau défile seul en largeur dans sa carte (la page non) en attendant P9. Clé devenue
    orpheline, laissée pour éviter des conflits de fusion : `planning.saison.horsGrilleN`.
  - À faire par Timothée : rien à publier (droits inchangés) ; relire le 中文 de `planning.gestion.*` ajouté (« 全部预约 »,
    « {{edition}} · 每天谁预约了什么 », « 筛选预约 », « 即将到来 n », « 已过 n », « 不在时段表内 n », « 预约人 », « 启动后可用 »,
    « {{edition}} 已结束 », « 成员在{{date}}之前会看到感谢语，之后此标签将显示{{suivante}}。… », « 为{{annee}}年{{fete}}做准备 », « 打印 »).
