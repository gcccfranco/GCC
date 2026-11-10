# Skills (consigne de Timothée du 13/09/2026, allégée le 17/10/2026 puis le 10/11/2026)
Skills vendorisés dans `.claude/skills/`. En cas de conflit, le `CLAUDE.md` racine gagne.

- **Code** : un seul skill, celui de la phase, dans la session qui fait le travail, jamais dans une orchestratrice
  qui ne fait que lancer `/tranche` (go efficience de Timothée, 10/11/2026) : cadrer `spec-driven-development` (`grilling` si flou, à la place d'`interview-me` : validé le 10/11/2026) ·
  implémenter `incremental-implementation` (pour une UI : `frontend-ui-engineering`) · bug
  `debugging-and-error-recovery` · relire `code-review-and-quality` · livrer `git-workflow-and-versioning`.
  Les autres : sur besoin précis.
- **Design du site** : `frontend-design` + `apple-design` ; + `taste-skill` et `web-design-engineer` pour une
  planche ou pour rechoisir la direction (à rechoisir : « Sobre sur crème » rouverte le 13/09/2026, rester
  sobre mais moins fade et moins « document »).
- **Agents** (`executant`, `testeur`, `chercheur`, workflows) : aucun skill, la consigne porte la méthode. Exception,
  l'équipe design (02/11/2026), par le champ `skills:` de l'agent : `directeur-artistique` `frontend-design` +
  `apple-design`, `maquettiste` `web-design-engineer` + `frontend-design`. `critique-design` ne précharge plus rien
  (10/11/2026) : il suit `.claude/references/critique-gcc.md`, grille condensée d'`impeccable`, `avoid-ai-design`,
  `web-design-guidelines` et `unslop`, et n'ouvre ces sources que pour un point précis.
- **Skills design du 02/11/2026** (scannés, alertes vérifiées) : `avoid-ai-design`, `unslop` tels quels ;
  `web-design-guidelines` lit une copie figée (`guidelines.md`), sans téléchargement ; `impeccable` allégé : sans
  `scripts/` ni les commandes `live`, `generate`, `hooks`, `doctor`, `pin` (le lanceur téléchargeait et exécutait un
  binaire fermé). Ne pas réinstaller la version complète sans décision de Timothée.
- **Retraits du 10/11/2026** (liste issue de l'audit, validée par Timothée) : 33 skills jamais cités ou en doublon (dont `using-agent-skills`,
  `interview-me`) ; ne pas les réinstaller sans demande.
- **Scan de sécurité** (01/11/2026) : tout skill ajouté se scanne avec SkillSpector (NVIDIA) avant d'être commité :
  `python3 scripts/scan-skills.py` n'affiche que les alertes absentes de `.claude/skillspector-reference.json` (faux
  positifs vérifiés) ; `--maj` accepte les nouvelles. Installation :
  `uv tool install git+https://github.com/NVIDIA/skillspector.git`.
