# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# Skills obligatoires (branche ui/apple-design, consigne de Timothée du 13/09/2026)

Skills vendorisés dans `.claude/skills/` depuis 6 dépôts : addyosmani/agent-skills,
mattpocock/skills, leonxlnx/taste-skill, anthropics frontend-design,
ConardLi/garden-skills, nextlevelbuilder/ui-ux-pro-max-skill. La liste des skills
chargés fait foi pour leurs descriptions.

## Avant de coder — à chaque tâche
Invoquer `using-agent-skills` (routeur), puis **chaque** skill dont la phase est
touchée, avec l'outil Skill, avant d'écrire la ligne concernée :
- cadrer : `spec-driven-development`, `planning-and-task-breakdown`, `interview-me` si la demande est floue ;
- implémenter : `incremental-implementation`, `source-driven-development`,
  `test-driven-development` + `tdd`, `frontend-ui-engineering` pour toute UI,
  `api-and-interface-design` / `codebase-design` pour une interface ou un module ;
- bug : `debugging-and-error-recovery` + `diagnosing-bugs` ;
- relire : `code-review-and-quality` + `mattpocock-code-review`, `code-simplification`,
  `security-and-hardening` / `performance-optimization` si le code y touche ;
- livrer : `git-workflow-and-versioning`, `documentation-and-adrs`, `shipping-and-launch`.

## Avant tout travail de design du site — à chaque fois
Invoquer **tous** : `frontend-design`, `taste-skill`, `redesign-skill`,
`web-design-engineer`, `ui-ux-pro-max`, `ui-styling`, `design-system`, plus
`apple-design` (déjà installé). Parmi les skills de style (`minimalist-skill`,
`soft-skill`, `brutalist-skill`, `gpt-tasteskill`, `stitch-skill`), prendre celui
qui sert la direction retenue — aujourd'hui « Sobre & classique » → `minimalist-skill`.
Génération d'images, bannières, slides, articles, vidéo : seulement si la tâche en produit.

## Priorités en cas de conflit
Les règles du `CLAUDE.md` racine gagnent : commits séparés par fichier, commit sur
demande seulement, tests via Playwright, zones gelées, simplicité (Karpathy).

## Renommages locaux (collision avec des skills intégrés)
- `code-review` (Matt Pocock) → `mattpocock-code-review` ; `/code-review` reste l'intégré.
- `design` (ui-ux-pro-max) → `ui-ux-pro-max-design` ; `design` reste l'intégré (canvas).
