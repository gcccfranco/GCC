# Spec — Occupation des salles (AR) : cadrage

- **Origine** : retour rapporté par Timothée le 16/11/2026 : « Scène : Réfléchir à modifier (fusionner) cette
  fonctionnalité "scène" à une fonctionnalité plus globale "occupation des salles" (salle bonté, salle
  réunion/imprimante, salle à côté de réunion, scène etc), le but est de pouvoir renseigner les occupations des
  différentes salles à l'église afin de ne pas créer de doublon ou ne pas avoir d'endroit pour se réunir (à réfléchir) ».
- **Réponses de Timothée (16/11/2026)** : la liste des salles et leurs occupations du dimanche (ci-dessous) ; qui
  réserve : « Tout le monde je pense » ; « oui pour une réunion, un évènement, il faut réserver la salle » ; « Peut à
  la place de mettre des plages, laisser les personnes mettre le temps qu'ils veulent réserver ». Puis : « quand c'est
  un dimanche avec intergroupe toutes les salles sont disponibles de sur le temps de groupe qui est de 13h à 14h30.
  Quand c'est un dimanche avec interfranco la salle bonté et salle paix sont disponibles de 13h à 14h30 sauf la salle
  fidélité qui sera occupé par le groupe joie. » Puis : « la grande salle est occupé pour intergroupe par les 5
  groupes, et pour interfranco la grande salle est occupé par les 3 groupes francophones ».
- **Portée élargie (Timothée, 16/11/2026, en accordant la planche)** : « Oui, il faudrait peut être la fusionner avec
  la réservation de la scène. En fait il faudrait revoir tout le système de réservation ainsi que sa page. L'onglet
  évènement est à changer ? » La planche porte donc sur **tout le système de réservation, Scène comprise, et sa page**,
  et sur la place de l'onglet Évènements.
- **Statut** : **planche validée par Timothée le 16/11/2026** (« Église, je valide ») : la piste retenue est en tête de
  `docs/planches/planche-salles-reservation.html`. **Reste à écrire ici : les règles, le modèle, les tranches et les
  tests** (§ « Reprise »), puis demander le go. **Pas de go pour AR** : le « go pour coder » du 16/11 répondait à la
  question sur le lot Scène de Noël (AQ) et précède cette spec (`CLAUDE.md`, « Go » : après la spec).
- **Base de code** : `claude/corrections-design` à `4f1134e`.

## Ce que le code montre

- **La Scène est déjà une salle** : des créneaux, un refus des chevauchements, un message aux deux auteurs si deux
  enregistrements se croisent (`src/lib/scene/`, `/api/scene/conflit`). Elle n'existe que pour une fête (Pâques, Noël)
  et pendant sa période de réservation ; « la scène est une seule salle » interdit même deux fêtes à la fois
  (`erreursSaison`, `autreFete`).
- **Aucune notion de salle ailleurs** : un évènement ou une réunion porte un `lieu` en texte libre (120 caractères),
  sans contrôle (`src/types/evenement.ts`, `EvenementForm`, `ReunionForm`). Le Sheet des évènements a une colonne
  « Lieu ».
- **Le Calendrier réunit déjà tout par jour** (services, évènements, réunions, tâches, créneaux de scène, petit déj,
  `src/lib/calendrier/entrees.ts`) : une vue par salle y lirait les mêmes sources.
- **Intergroupe et Interfranco** sont des dimanches connus de l'app (leurs dates sont dans la feuille du planning ;
  la section Groupes du planning est remplacée ce jour-là, `docs/intent/vision-site.md`). Ce que ça change pour les
  salles : S-Q4.

## Les salles (Timothée, 16/11/2026)

Une salle a parfois deux noms, selon qui l'occupe. Occupations fixes : **tous les dimanches**.

| Salle | Autre nom | Occupations du dimanche |
|---|---|---|
| Grande salle | | 8:30–10:30 entraînement de la louange du culte francophone ; 10:30–12:00 culte francophone ; 13:00–14:30 groupe Joie ; 15:00–17:00 culte sinophone |
| Salle Fidélité | Salle 小班 | 13:00–14:30 ; 15:30–17:00 (小班) |
| Salle Paix | Salle 高班 | 13:00–14:30 ; 15:30–17:00 (高班) |
| Salle Amour | Salle 大班 | 13:00–14:30 ; 15:30–17:00 (大班) |
| Salle Bonté | | 13:00–14:30 |
| Salle 中班 | aucun : une salle à part | 15:30–17:00 |
| Salle imprimante | | 12:20–12:40, l'équipe de louange du culte francophone du jour |
| Salle de réunion | | aucune ; c'est une autre salle que la Salle imprimante |
| Scène | **dans la Grande salle** | réservations des fêtes (aujourd'hui) ; aucun entraînement sur scène pendant le culte sinophone ni pendant le groupe Joie |

**Conséquence pour la Scène d'aujourd'hui** : la grille par défaut d'une saison (dimanche 14:00–19:00, créneaux d'une
heure) propose des créneaux qui croisent le groupe Joie (jusqu'à 14:30) et le culte sinophone (15:00–17:00). Le
dimanche, la scène n'est vraiment libre qu'entre 14:30 et 15:00, puis après 17:00 : d'où le besoin d'autres jours.

### Le temps de groupe (13:00–14:30) selon le dimanche (Timothée, 16/11/2026)

L'app connaît déjà les dimanches d'Intergroupe et d'Interfranco (feuille du planning) : l'emploi du temps peut donc
changer tout seul ces jours-là, sans exception à saisir.

| Salle | Dimanche ordinaire | Intergroupe | Interfranco |
|---|---|---|---|
| Salle Fidélité | occupée | libre | groupe Joie |
| Salle Bonté | occupée | libre | libre |
| Salle Paix | occupée | libre | libre |
| Salle Amour | occupée | libre | occupée par le groupe Amour (confirmé) |
| Grande salle | groupe Joie | Intergroupe : les cinq groupes | Interfranco : les trois groupes francophones |

## Décisions (16/11/2026)

| # | Décision | D'où |
|---|---|---|
| AR1 | **Piste retenue : A, avec la grille de B en deuxième vue.** Salles a deux vues, « Liste · Grille » : la liste des salles avec l'état en mots et un ruban (A), la grille salles × heures (B). | Timothée : « J'aime beaucoup la piste A, j'aime beaucoup le calendrier de la piste B pour avoir un aperçu global des réservations » ; « je valide » (planche, section « Piste retenue »). |
| AR2 | L'entrée de la barre s'appelle **« Église »** (icône d'église), sous-titre « Évènements, salles et fêtes » ; rail **« Évènements · Salles · Pâques · Noël »** (« Évènements » remplace « Calendrier »). Les adresses ne changent pas (`/evenements/…`). | Timothée : « il y a plusieurs choses de mélange dedans » ; « Église, je valide ». |
| AR3 | Liste par défaut au téléphone, Grille par défaut à la tablette en paysage et à l'ordinateur ; le choix est retenu sur l'appareil. | Validé avec la planche. |
| AR4 | Tout membre connecté réserve ; date, « de », « à » libres, pas de créneaux imposés ; un chevauchement est refusé. | Timothée. |
| AR5 | Une réunion ou un évènement réserve sa salle. | Timothée. |
| AR6 | La Scène est dans la Grande salle : ce qui occupe l'une occupe l'autre. | Timothée. |
| AR7 | Les salles, leurs deux noms, l'emploi du temps du dimanche et ses trois variantes : tableaux ci-dessus. | Timothée. |
| AR8 | De la piste C : la feuille « Réserver » commence par le moment puis propose les salles libres en tête, les occupées non choisissables avec leur raison et « Décaler » ; la page d'une fête montre quand la scène est libre. | Recommandation annoncée à Timothée avec la planche, validée avec elle. |
| AR9 | **Propositions retenues sans objection** (annoncées à Timothée le 16/11 : « je garde les propositions suivantes ») : la Scène bascule dans Salles **après Noël 2026**, et d'ici là Salles lit ses créneaux en lecture seule ; neuf lignes (huit salles et la Scène), la « salle à côté de réunion » tenue pour la Salle imprimante ; noms de salles en français dans les deux langues, sauf 小班, 中班, 大班, 高班 ; Salles invisible sans compte ; « Pour qui » en liste avec « Autre… » ; champ « Salle de l'église » (et « Ailleurs ») dans les formulaires ; réservations répétées par un membre : plus tard. | Planche, « Questions à trancher » et « Reste à trancher ». Décision déléguée, à corriger par Timothée. |

Les autres propositions de la section « Questions à trancher » de la planche (jour J d'une fête, saisie de l'emploi
du temps en un modèle à trois variantes avec exceptions datées, repère « à 14:00 », couleurs) se tranchent en écrivant
les règles, selon la proposition écrite (« décision déléguée »), sauf si le choix est difficile à défaire.

## Reprise (pour la session qui écrit la suite)

1. Lire ce fichier, la section « Piste retenue » de la planche (ouvrir ses quatre cadres par capture d'élément, pas la
   pleine page) et, par extraits, `src/lib/scene/saison.ts`, `src/types/programme.ts`, `firestore.rules` (`programmes`),
   `src/lib/calendrier/entrees.ts`, `src/lib/navigation.ts`, `src/components/evenements/EvenementsTabs.tsx`.
2. Écrire ici : modèle (salles et emploi du temps dans le code ou en base ; collection des réservations en REST),
   règles numérotées, permissions en double (`access.ts`, `firestore.rules`), libellés FR et 中文, tranches et tests
   Playwright (cinq projets pour l'agencement), ce qui se fait à la mise en ligne.
3. Découper selon « Lots pressentis » ; le renommage de l'entrée (« Église », rail) peut être une première petite
   tranche. Le lot de la Scène attend la fin de la saison de Noël (AR9).
4. Demander le go à Timothée, lot par lot. Le lot AQ (`docs/spec-scene-qui-autre-moment.md`) se code en parallèle
   dans `src/app/evenements/scene/` : ne pas y toucher avant sa fin.

## Principes proposés (repris par les décisions ci-dessus)

| # | Principe |
|---|---|
| S1 | Une salle est un lieu physique ; ses deux noms mènent à la même occupation (réserver « Salle 小班 » prend « Salle Fidélité »). |
| S2 | L'**emploi du temps fixe** du dimanche se saisit une fois (coordination), par semaine ; il s'affiche occupé et ne se réserve pas par-dessus. Il a trois variantes, choisies d'après la feuille du planning : dimanche ordinaire, Intergroupe, Interfranco (tableau ci-dessus). Une autre exception (fête) se règle à part : à dessiner. |
| S3 | **Réserver** : tout membre connecté (Timothée) choisit une salle, une date, « de » et « à » librement (Timothée), dit pour qui et pour quoi. Un chevauchement est refusé, comme sur la Scène. |
| S4 | **Réunion, évènement** : choisir une salle dans leur formulaire la réserve (Timothée) ; la réservation suit la date et l'heure, et part avec la réunion. Le lieu en texte libre reste pour l'extérieur. |
| S5 | **La Scène** est réservée par le même système (Timothée, 16/11 : « la fusionner », « revoir tout le système de réservation ainsi que sa page »). Elle est dans la Grande salle : ce qui occupe l'une occupe l'autre. La fête garde ce qui lui est propre (ordre de passage, chants, « Qui peut réserver »). **Date de bascule de la Scène** : à trancher (S-Q10), la saison de Noël est en cours. |
| S6 | Permissions en double (`src/lib/access.ts` et `firestore.rules`) : règles à publier par Timothée. Occupations lisibles par tout connecté, comme les setlists et les profils. |
| S7 | Back-office : derrière `BACK_OFFICE` pour la saisie de l'emploi du temps ; la réservation est dans l'App. |

## Questions ouvertes

**Faits, à Timothée**

- S-Q1 à S-Q4 : **répondues le 16/11/2026** (tableaux ci-dessus). Non demandé : la « salle à côté de réunion » du
  premier retour est-elle la Salle imprimante ?
- S-Q10. La Scène bascule-t-elle dans le nouveau système avant Noël (réservations en cours à reprendre) ou après ?

**Dessin, pour la planche**

- S-Q5. Où vit la section (onglet de l'App, Évènements, Calendrier) et son nom (« Salles ») ? Timothée, 16/11 :
  « L'onglet évènement est à changer ? » : aujourd'hui cinq entrées (Chants, Setlists, Planning, Évènements, Moi) et,
  dans Évènements, un rail Agenda · Pâques · Noël.
- S-Q6. La vue d'un jour : salles en colonnes et heures en lignes, ou liste par salle ; ce qu'on voit au téléphone.
- S-Q7. La feuille de réservation, et ce qu'un refus propose (salles libres à cette heure).
- S-Q8. Le champ « salle » des formulaires de réunion et d'évènement.
- S-Q9. Une réservation répétée par un membre (« tous les mardis ») : dès le premier lot, ou plus tard ?

## Lots pressentis (à découper après la planche)

1. Les salles, l'emploi du temps fixe, la vue d'un jour (lecture).
2. Réserver librement, refus des chevauchements.
3. Réunions et évènements réservent leur salle.
4. La Scène passe dans le même système (date : S-Q10).

## Avancement

- 16/11/2026 : cadrage écrit d'après les réponses de Timothée. Reste : S-Q1 à S-Q4, l'accord pour la planche.
- 16/11/2026 : dimanches d'Intergroupe et d'Interfranco ajoutés (S2 à trois variantes). Reste : S-Q1 à S-Q3, la fin
  de S-Q4, l'accord pour la planche.
- 16/11/2026 : Grande salle des dimanches d'Intergroupe (cinq groupes) et d'Interfranco (trois groupes francophones) ;
  S-Q4 répondue. Reste : S-Q1 à S-Q3, l'accord pour la planche.
- 16/11/2026 : S-Q1 à S-Q3 répondues (Salle 中班 à part ; Scène dans la Grande salle ; Salle imprimante : louange du
  culte francophone ; Salle de réunion à part). Portée élargie à tout le système de réservation, Scène comprise.
  Planche `salles-reservation` lancée (accord de Timothée).
- 16/11/2026 : **planche rendue** (`docs/planches/planche-salles-reservation.html`, retouchée après la critique,
  publiée en artefact pour Timothée). Trois pistes : **A. Le tableau des salles (recommandée)** : onglet « Salles » dans
  Évènements (Calendrier · Salles · Pâques · Noël), une ligne par salle avec son état en mots, la Scène en retrait
  sous la Grande salle ; B. La journée de l'église (grille salles × heures, entrée renommée « Agenda ») ; C. Où se
  réunir ? (pas de section, un bouton « Trouver une salle »). Proposé : A, avec de C la feuille qui commence par le
  moment et les fenêtres libres de la scène sur la page de Noël ; bascule de la Scène après Noël 2026. Questions et
  propositions : section « Questions à trancher » de la planche. **Attend le choix de Timothée**, puis les décisions
  et les tranches ici.
- 16/11/2026 : **choix de Timothée** : « J'aime beaucoup la piste A, j'aime beaucoup le calendrier de la piste B pour
  avoir un aperçu global des réservations. Peut être qu'il faut changer le nom de l'onglet événement, parce qu'il y a
  plusieurs choses de mélange dedans ». Retenu : **la piste A, avec la grille de B comme deuxième vue de Salles**
  (« Liste · Grille »). Proposé à Timothée, sans réponse encore : l'entrée de la barre renommée **« Église »** (autre
  nom possible : « Agenda »), rail « Évènements · Salles · Pâques · Noël », adresse `/evenements` inchangée ; Liste par
  défaut au téléphone, Grille par défaut en grand. Une section « Piste retenue » est ajoutée à la planche. Restent sans
  réponse : la bascule de la Scène (proposé : après Noël), le nombre de salles (neuf ou dix), les noms en 中文.
- 16/11/2026 : **planche validée** (« Église, je valide et tu peux go pour coder ») : décisions AR1 à AR9 ci-dessus.
  Le go porte sur le lot AQ (question posée : « Go pour le lot Scène de Noël ? ») ; AR attend sa spec. La session de
  cadrage a atteint son plafond de contexte : une session neuve écrit la suite (§ « Reprise ») et demande le go.
