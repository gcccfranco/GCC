# Spec — Occupation des salles (AR) : cadrage

- **Origine** : retour rapporté par Timothée le 16/11/2026 : « Scène : Réfléchir à modifier (fusionner) cette
  fonctionnalité "scène" à une fonctionnalité plus globale "occupation des salles" (salle bonté, salle
  réunion/imprimante, salle à côté de réunion, scène etc), le but est de pouvoir renseigner les occupations des
  différentes salles à l'église afin de ne pas créer de doublon ou ne pas avoir d'endroit pour se réunir (à réfléchir) ».
- **Réponses de Timothée (16/11/2026)** : la liste des salles et leurs occupations du dimanche (ci-dessous) ; qui
  réserve : « Tout le monde je pense » ; « oui pour une réunion, un évènement, il faut réserver la salle » ; « Peut à
  la place de mettre des plages, laisser les personnes mettre le temps qu'ils veulent réserver ».
- **Statut** : **cadrage**. Change l'organisation des écrans : planche d'abord (`CLAUDE.md`, « Design »), puis les
  décisions et les tranches ici, puis le code sur go. **Ni planche lancée ni go.**
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
| Salle 中班 | à préciser (S-Q1) | 15:30–17:00 |
| Salle imprimante | | 12:20–12:40 (par qui : S-Q3) |
| Salle de réunion | | aucune donnée |
| Scène | | réservations des fêtes (aujourd'hui) |

## Principes proposés (à valider après la planche)

| # | Principe |
|---|---|
| S1 | Une salle est un lieu physique ; ses deux noms mènent à la même occupation (réserver « Salle 小班 » prend « Salle Fidélité »). |
| S2 | L'**emploi du temps fixe** du dimanche se saisit une fois (coordination), par semaine ; il s'affiche occupé et ne se réserve pas par-dessus. Une exception d'un dimanche (Intergroupe, Interfranco, fête) se règle à part : à dessiner. |
| S3 | **Réserver** : tout membre connecté (Timothée) choisit une salle, une date, « de » et « à » librement (Timothée), dit pour qui et pour quoi. Un chevauchement est refusé, comme sur la Scène. |
| S4 | **Réunion, évènement** : choisir une salle dans leur formulaire la réserve (Timothée) ; la réservation suit la date et l'heure, et part avec la réunion. Le lieu en texte libre reste pour l'extérieur. |
| S5 | **La Scène** entre dans la liste **après Noël** : la saison en cours n'est pas touchée. La fête garde ce qui lui est propre (ordre de passage, chants, « Qui peut réserver »). La feuille « un autre moment » du lot AQ est la même que celle des salles. |
| S6 | Permissions en double (`src/lib/access.ts` et `firestore.rules`) : règles à publier par Timothée. Occupations lisibles par tout connecté, comme les setlists et les profils. |
| S7 | Back-office : derrière `BACK_OFFICE` pour la saisie de l'emploi du temps ; la réservation est dans l'App. |

## Questions ouvertes

**Faits, à Timothée**

- S-Q1. La Salle 中班 est-elle une salle à part, ou la même qu'une autre (Bonté ?) ?
- S-Q2. La Scène est-elle dans la Grande salle ? Si oui, un entraînement sur scène et une occupation de la Grande
  salle (culte sinophone, groupe Joie) s'excluent-ils ?
- S-Q3. Salle imprimante, 12:20–12:40 : par qui ? « Salle imprimante » et « Salle de réunion » sont-elles deux salles,
  et la « salle à côté de réunion » du premier retour en est-elle une troisième ?
- S-Q4. Les dimanches d'Intergroupe et d'Interfranco, quelles salles sont libérées, lesquelles sont prises ?

**Dessin, pour la planche**

- S-Q5. Où vit la section (onglet de l'App, Évènements, Calendrier) et son nom (« Salles ») ?
- S-Q6. La vue d'un jour : salles en colonnes et heures en lignes, ou liste par salle ; ce qu'on voit au téléphone.
- S-Q7. La feuille de réservation, et ce qu'un refus propose (salles libres à cette heure).
- S-Q8. Le champ « salle » des formulaires de réunion et d'évènement.
- S-Q9. Une réservation répétée par un membre (« tous les mardis ») : dès le premier lot, ou plus tard ?

## Lots pressentis (à découper après la planche)

1. Les salles, l'emploi du temps fixe, la vue d'un jour (lecture).
2. Réserver librement, refus des chevauchements.
3. Réunions et évènements réservent leur salle.
4. La Scène devient une salle (après Noël).

## Avancement

- 16/11/2026 : cadrage écrit d'après les réponses de Timothée. Reste : S-Q1 à S-Q4, l'accord pour la planche.
