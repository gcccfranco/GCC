# Spec : chantier Planning (Interfranco et Intergroupe)

Chantier n° 3 de `docs/intent/vision-site.md` (« Ordre des chantiers »).
**Statut : validée par Timothée le 14/09/2026, réalisée le même jour.**

## Objectif

Un dimanche où il y a Interfranco ou Intergroupe, l'accueil du planning
(« Ce dimanche », `/planning`) montre encore la section « Groupes » (Paix,
Fidélité, Bonté). Ces jours-là, cette section doit être **entièrement
remplacée** par Interfranco ou Intergroupe, avec son planning. Le Culte Franco,
la Prépa. Table et l'EDD ne changent pas. Interfranco et Intergroupe ne tombent
jamais le même dimanche (vision, tour 6).

## Ce que le code et les feuilles montrent (14/09/2026)

- `src/app/planning/page.tsx` charge déjà les feuilles Intergroupe et
  Interfranco (l. 75-76), mais ne s'en sert que pour « Prochain service ». La
  section Groupes est écrite en dur (l. 177-196).
- Chaque feuille a **une ligne par séance, datée** (en 2026 : Intergroupe les
  15/03, 12/04 et 06/09 ; Interfranco les 14/06 et 09/08). Colonnes, après la
  date :
  - Intergroupe : Présidence, 3 choristes, Piano, Guitare, Cajon/Batterie,
    Sono + Live, PPT, Orateur, Traduction ;
  - Interfranco : les mêmes avec 2 choristes.
- Les feuilles des groupes portent aussi « Intergroupe » ou « Inter franco » ces
  jours-là, mais de façon irrégulière (orthographe, colonne) : on ne s'y fie pas.
- « Mes services » et la carte « Prochain service » comptent déjà Interfranco et
  Intergroupe (`findMyServices`, `src/lib/planning/names.ts`) : **rien à changer**.
- Couleurs de service existantes (gelées) : Intergroupe `#a87b0f`, Interfranco
  `#9d3c63` (`src/lib/serviceColors.ts`).

## Ce qui est construit

- **Reconnaître le dimanche** : la date du dimanche affiché figure dans la
  feuille Interfranco ou dans la feuille Intergroupe.
- **Remplacer la section Groupes** par une section « Interfranco » ou
  « Intergroupe », avec la pastille de sa couleur de service, qui liste comme
  le Culte Franco : Présidence, Choristes (réunis sur une ligne), Piano,
  Guitare, Cajon/Batterie, Sono, PPT, Orateur, Traduction. Les cases vides ne
  s'affichent pas (comme aujourd'hui).
- **Si la feuille ne se charge pas** : la section Groupes reste affichée. Le
  bandeau « planning peut-être périmé » ne s'affiche pas pour autant :
  `fetchSheet` transforme un échec réseau en liste vide (comportement inchangé,
  remarqué en route).
- Même rendu en français et en 中文 (libellés déjà traduits).

## Hypothèses (confirmées le 14/09/2026)

1. La date de la feuille suffit : une ligne présente = séance ce dimanche-là,
   même si les noms ne sont pas encore remplis (on affiche alors « — » comme
   pour le Culte Franco sans données).
2. On liste tous les rôles de la feuille, comme pour le Culte Franco.
3. Le changement ne touche que l'accueil du planning ; les onglets et les
   tableaux Interfranco et Intergroupe restent tels quels.

## Commandes

```bash
npx tsc --noEmit
npm test -- tests/planning-accueil.spec.ts
npm test            # suite complète avant de rendre la main
```

## Tests (Playwright, trois appareils)

`tests/planning-accueil.spec.ts`, session simulée (`tests/helpers/fakeSession.ts`),
feuilles Google simulées (`page.route`) et date figée (`page.clock`) :

- dimanche Interfranco : section Interfranco avec ses noms, pas de « Groupes » ni
  de « Groupe Paix » ; Culte Franco toujours là ;
- dimanche Intergroupe : section Intergroupe avec ses 3 choristes ;
- dimanche normal : section Groupes inchangée ;
- une fois en 中文 (libellé traduit).

Écrits d'abord, vus en échec, puis passés. Captures regardées sur les trois
appareils.

## Limites

- Toujours : tests sur ordinateur, téléphone et tablette ; aucune écriture en production.
- Demander avant : toute retouche du style d'ensemble du planning (chantier 5),
  des tableaux ou de la façon de remplir le Google Sheet (hors périmètre).
- Jamais : changer les couleurs de services.

## Critères de réussite

- Le 14/06/2026, l'accueil montre « Interfranco » avec Jonathan Z. à la
  présidence, et aucune section Groupes.
- Le 06/09/2026, il montre « Intergroupe » avec ses trois choristes.
- Le 21/06/2026, il montre Groupes (Paix, Fidélité, Bonté) comme aujourd'hui.
