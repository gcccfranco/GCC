# Suivi du travail : feuille de route et specs

Pas d'issues GitHub dans ce dépôt, et pas de CLI `gh`. Le travail se suit
dans deux sortes de fichiers, en français :

- **`docs/feuille-de-route.md`** : § 1 Fait, § 2 À construire (dans l'ordre
  validé), § 3 Demandes (une lettre par demande, de A à T au 02/10/2026 ; la
  suivante est U), § 5 Écarté, § 6 Journal.
- **`docs/spec-<sujet>.md`** : une spec par lot (décisions, tranches T1,
  T2…, § Avancement).

La vision produit est dans `docs/intent/vision-site.md` : la relire avant un
chantier, y reporter chaque décision.

## Ce que valent les opérations des skills ici

- **Ticket** : une tranche d'une spec (`### T1 — …`), ou une demande lettrée
  de la feuille de route qui n'a pas encore de spec.
- **« Publish to the issue tracker »** : une spec s'écrit dans
  `docs/spec-<sujet>.md`, et la feuille de route reçoit sa lettre (§ 3) avec
  le lien vers la spec. Des tickets s'ajoutent comme tranches numérotées de
  la spec, un titre par tranche, jamais dans un fichier à part.
- **« Fetch the relevant ticket »** : lire la spec, et sa lettre dans la
  feuille de route. Timothée donne en général le nom de la spec ou la lettre.
- **Statut (étiquette de tri)** : une ligne `Statut : <étiquette>` sous le
  titre de la demande ou de la tranche, avec les chaînes de
  `docs/agents/triage-labels.md`.
- **Commentaire** : une ligne datée dans le § Avancement de la spec, ou dans
  le § 6 Journal de la feuille de route.
- **Fermer** : fait → la demande passe au § 1 Fait, datée ; `wontfix` →
  § 5 Écarté, daté, avec la raison.

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
