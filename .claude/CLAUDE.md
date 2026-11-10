# Skills (consigne de Timothée du 13/09/2026 ; allégée le 17/10 et le 10/11/2026 ; aiguillage du 10/11/2026 au soir)
58 skills vendorisés dans `.claude/skills/`. En cas de conflit, le `CLAUDE.md` racine gagne. Tableau complet (moment,
porteur et poids de chaque skill) : `docs/orchestration.md` § 4 « Skills », à lire avant d'en ajouter ou d'en déplacer un.

- **Règle** : un seul skill, celui de la phase, dans la session ou l'agent qui fait le travail, jamais dans une
  orchestratrice qui ne fait que lancer `/tranche` (go efficience de Timothée, 10/11/2026). Au-delà de 10 000
  caractères, un skill s'ouvre par section (`grep -n '^#'` puis la plage).
- **Visibles et dormants** : 23 skills sont dans la liste que chaque session et chaque agent relit (ceux d'une phase
  ou préchargés par un agent ; la garder sous 8 000 caractères). Les 35 autres sont dormants
  (`disable-model-invocation: true`) : gratuits tant qu'on ne s'en sert pas, lancés par Timothée (`/nom`) ou ouverts
  par chemin (`.claude/skills/<nom>/SKILL.md`) au moment que dit l'aiguillage. Un skill ajouté est dormant par défaut
  et prend une ligne dans l'aiguillage : sans elle, il ne sert pas.
- **Code** : cadrer `spec-driven-development` (`grilling` si flou) · implémenter `incremental-implementation` (UI :
  `frontend-ui-engineering`) · bug `debugging-and-error-recovery`, puis un seul dormant selon la cause :
  `click-path-audit` (bouton sans effet), `e2e-testing` (test instable), `react-patterns`, `nextjs-turbopack`,
  `typescript-patterns` · libellés des deux langues `i18n-sync` · performance `react-performance` · relire
  `code-review-and-quality` (relecture courte, en mots simples pour Timothée : `ponytail-review`) · livrer
  `git-workflow-and-versioning`. Audit : `ponytail-audit` (un agent) avant tout `/audit-code` ; dette (`shortcut:`) :
  `ponytail-debt` ; coût des skills et des agents : `context-budget`. Les autres : sur besoin précis.
- **Design du site** : `frontend-design` + `apple-design` ; + `taste-skill` et `web-design-engineer` pour une
  planche ou pour rechoisir la direction (à rechoisir : « Sobre sur crème » rouverte le 13/09/2026, rester
  sobre mais moins fade et moins « document »). Après une planche validée, cotes d'un composant :
  `dimensional-drawing` (film : `dimensional-drawing-motion`, sur demande). Illustration ou démonstration animée du
  site : `stageshow`. `astryx` : idées pour une planche hors dépôt, jamais dans le code du site.
- **Agents** : la consigne porte la méthode, aucun skill. Exceptions, par le champ `skills:` (un dormant ne se
  précharge pas) : `executant` `ponytail` (10/11/2026) ; équipe design (02/11/2026) : `directeur-artistique`
  `frontend-design` + `apple-design`, `maquettiste` `web-design-engineer` + `frontend-design`. `critique-design` suit
  `.claude/references/critique-gcc.md`, grille condensée d'`impeccable`, `avoid-ai-design`, `web-design-guidelines`
  et `unslop`, et n'ouvre ces sources que pour un point précis ; le `relecteur` porte de même l'axe « allégé » de
  `ponytail-review`. `karpathy-guidelines` est déjà le § « Comportement » du `CLAUDE.md` racine : ne pas le charger.
- **Versions allégées** : `impeccable` (02/11/2026) sans `scripts/` ni `live`, `generate`, `hooks`, `doctor`, `pin`
  (le lanceur téléchargeait et exécutait un binaire fermé) ; `stageshow` (10/11/2026) sans `kit/`, `examples/` ni
  `scripts/` (logos de marques tierces), pris dans un clone temporaire au besoin ; `web-design-guidelines` lit une
  copie figée (`guidelines.md`). Ne pas réinstaller une version complète sans décision de Timothée.
- **Retraits du 10/11/2026** (audit, validés par Timothée) : 33 skills jamais cités ou en doublon (dont
  `using-agent-skills`, `interview-me`) ; d'ECC, 8 skills retenus sur 314. Ne pas en réinstaller sans demande.
- **Scan de sécurité** (01/11/2026) : tout skill ajouté se scanne avec SkillSpector (NVIDIA) avant d'être commité :
  `python3 scripts/scan-skills.py` n'affiche que les alertes absentes de `.claude/skillspector-reference.json` (faux
  positifs vérifiés) ; `--maj` accepte les nouvelles. Installation :
  `uv tool install git+https://github.com/NVIDIA/skillspector.git`. Exception : les 19 skills du 10/11/2026 au soir,
  ajoutés sans scan sur consigne de Timothée (le prochain scan les affichera).
