# Orchestrateur du chantier « équipes et groupes »

Fait coder la suite du chantier (lots 1, partage, 3, 2 puis 4) tranche par tranche, à moindre coût, sans session qui
gonfle. Mis en place le 12/10/2026 à la demande de Timothée.

## Principe

- **Un passage `claude -p` par tranche**, à contexte neuf : la consigne (`consigne-tranche.md`) + la spec du lot. Pas de
  longue conversation qui relit tout à chaque tour.
- **L'exécutant est Sonnet 5.5** (effort `medium`) **avec l'outil advisor** : il consulte **Opus 5.5** deux fois par
  tranche (son plan, puis avant de committer). Opus ne fait que conseiller ; Sonnet écrit le code, deux fois moins cher.
- **La revue de chaque lot est faite par Opus 5.5** seul (`consigne-revue.md`) : relecture, corrections, passage complet.
- **L'orchestrateur est un script**, pas un modèle : il prend le prochain passage de `file.txt`, lance `claude -p`, vérifie
  qu'un commit au bon titre est là et que `npx tsc --noEmit` passe, puis `git pull --rebase` et pousse sur
  `ui/apple-design`. L'exécutant n'a pas le droit de pousser (`git push` refusé).
- **Reprise** : un passage est fait quand son commit (`ÉTIQUETTE TRANCHE : …`) est sur la branche. Relancé, le script
  saute ce qui est fait ; un passage coupé repart du travail laissé dans l'arbre.
- **Plafonds** (équivalent prix catalogue) : 5 $ par tranche, 8 $ par revue, 90 $ au total, cumulés d'un lancement
  à l'autre dans le journal.
  Deux essais par passage ; au-delà, il s'arrête et laisse le travail dans l'arbre.

## Facturation

Tout se paie sur le **forfait claude.ai** (usage visible dans les réglages de claude.ai), jamais sur des crédits API :
Timothée veut voir ce qui est dépensé (12/10/2026). Le script retire `ANTHROPIC_API_KEY` du passage imbriqué et refuse de
partir si Claude Code n'est pas connecté au forfait. Si la limite du forfait est atteinte, il s'arrête proprement ; relancé
après la remise à zéro, il reprend où il en était. Les dollars du journal et des plafonds sont l'équivalent au prix
catalogue que Claude Code calcule : une mesure de la consommation, pas une facture.

## Lancer

Sur un ordinateur (Claude Code installé et connecté au forfait) :

```bash
bash scripts/chantier/orchestrateur.sh
```

Dans une session cloud, où une commande ne tourne que 2 h : `ORCH_LIMITE_MIN=115 bash scripts/chantier/orchestrateur.sh`
en arrière-plan ; quand il écrit `RELANCER`, le relancer ; il s'arrête sur `FINI` ou `ARRÊT : …`.

À blanc (montre le prochain passage et sa consigne, ne dépense rien) : `ORCH_ESSAI=1 bash scripts/chantier/orchestrateur.sh`.

## Réglages (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ORCH_EXECUTANT` / `ORCH_ADVISOR` / `ORCH_EFFORT` | `claude-sonnet-5-5` / `claude-opus-5-5` / `medium` | tranches |
| `ORCH_RELECTEUR` / `ORCH_EFFORT_REVUE` | `claude-opus-5-5` / `high` | revues |
| `ORCH_PLAFOND_TRANCHE` / `ORCH_PLAFOND_REVUE` / `ORCH_BUDGET` | `5` / `8` / `90` | dollars |
| `ORCH_SEUL` | — | un seul passage, ex. `EQ-C` |
| `ORCH_LIMITE_MIN` / `ORCH_MARGE_MIN` | `0` (sans) / `50` | durée d'un lancement |

## Suivre

- `~/.orchestrateur-chantier/journal.tsv` : une ligne par essai (date, lot, tranche, essai, issue, coût, minutes, commit).
- `~/.orchestrateur-chantier/sorties/` : la sortie JSON de chaque passage (compte rendu, coût par modèle).
- Chaque tranche écrit son entrée dans la section « Avancement » de sa spec, comme avant.

## Ce qui ne change pas

Les règles de CLAUDE.md : branche `ui/apple-design` seule, jamais `main` ; aucune lecture de la vraie base Firestore
(scripts de migration lancés par Timothée seul) ; règles `firestore.rules` publiées à la main par Timothée ; noms
fictifs ; tests Playwright d'abord, trois appareils. Seule entorse assumée, pour l'économie : l'exécutant n'invoque que
deux ou trois skills, pas toute la liste de `.claude/CLAUDE.md`.
