# Suivi du travail : feuille de route et specs

Pas d'issues GitHub dans ce dépôt, et pas de CLI `gh`. Le travail se suit
dans deux sortes de fichiers, en français :

- **`docs/feuille-de-route.md`** (court, depuis le 10/11/2026) : état daté, ce
  qui reste ouvert, et l'**index** « lettre → spec → statut », une ligne par
  demande (de A à AN au 10/11/2026 ; la suivante est AO).
- **`docs/archive/feuille-de-route-2026.md`** : l'ancien document entier
  (demandes détaillées, tableau « Fait », journal, écartés), figé. **Jamais en
  entier** : `grep -n` puis `sed -n 'a,bp'` sur la section utile, et seulement
  si la spec ne suffit pas. Tout renvoi « § 1, § 2, § 3.X, § 4, § 5, § 6,
  § 7 » à la feuille de route, dans une spec, vise désormais cette archive
  (§ 4 = carte des modules, § 6 = journal).
- **`docs/spec-<sujet>.md`** : une spec par lot (décisions, tranches T1,
  T2…, § Avancement).

La vision produit est dans `docs/intent/vision-site.md` : la relire avant un
chantier, y reporter chaque décision.

## Ce que valent les opérations des skills ici

- **Ticket** : une tranche d'une spec (`### T1 — …`), ou une demande lettrée
  de la feuille de route qui n'a pas encore de spec.
- **« Publish to the issue tracker »** : une spec s'écrit dans
  `docs/spec-<sujet>.md`, et l'index de la feuille de route reçoit sa lettre,
  en une ligne, avec le nom de la spec. Des tickets s'ajoutent comme tranches numérotées de
  la spec, un titre par tranche, jamais dans un fichier à part.
- **« Fetch the relevant ticket »** : lire l'index de la feuille de route
  (lettre → spec), puis la spec ; l'archive seulement par section, pour une
  demande d'avant le 10/11/2026 dont la spec ne dit pas assez. Timothée donne
  en général le nom de la spec ou la lettre.
- **Statut (étiquette de tri)** : une ligne `Statut : <étiquette>` sous le
  titre de la tranche dans la spec (pour une demande sans spec : dans sa
  ligne d'index), avec les chaînes de `docs/agents/triage-labels.md`.
- **Commentaire** : une ligne datée dans le § Avancement de la spec (plus de
  journal dans la feuille de route ; « État » s'y réécrit, sans s'allonger).
- **Fermer** : fait → le statut de sa ligne d'index, daté ; `wontfix` →
  statut « écarté », daté, la raison dans la spec.

## Règles du dépôt qui priment

- `ready-for-agent` ne vaut pas « go » : seul Timothée donne le go d'un lot,
  après la spec.
- Rien ne se commite sans son ordre ; un commit par lot (`CLAUDE.md`).

## Wayfinding (`/wayfinder`)

- **Carte** : une spec `docs/spec-<effort>.md` avec les parties Notes,
  Décisions et Brouillard.
- **Ticket enfant** : un titre `### NN — <question>` dans cette spec, numéroté
  à partir de 01, avec une ligne `Type :` (`research` / `prototype` /
  `grilling` / `task`) et une ligne `Statut :` (`claimed` / `resolved`).
- **Blocage** : une ligne `Bloqué par : NN, NN` ; un ticket est débloqué quand
  tous ceux qu'il cite sont `resolved`.
- **Frontière** : les tickets ouverts, débloqués et non pris ; le plus petit
  numéro gagne.
- **Prendre** : `Statut : claimed`, enregistré avant tout travail.
- **Résoudre** : la réponse sous `#### Réponse`, `Statut : resolved`, puis un
  renvoi (l'essentiel et le titre du ticket) dans les Décisions de la carte.
