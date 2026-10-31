#!/bin/bash
# Graphe graphify des sessions cloud (claude.ai/code), lancé par le hook
# SessionStart de .claude/settings.json. La machine y est neuve à chaque
# démarrage et le graphe n'est pas versionné : on installe graphify (même
# version qu'en local) puis on le reconstruit depuis le code cloné, en une
# dizaine de secondes et sans clé d'API. Les exclusions viennent du .gitignore.
# En local, rien : le graphe s'y tient à jour à chaque message.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

BIN="$(uv tool dir --bin 2>/dev/null || echo "$HOME/.local/bin")"
if [ ! -x "$BIN/graphify" ]; then
  uv tool install --quiet graphifyy==0.8.36 >/dev/null 2>&1 || exit 0
fi
# Les commandes que Claude lance ensuite lisent ce fichier : graphify y devient trouvable.
[ -n "$CLAUDE_ENV_FILE" ] && echo "export PATH=\"\$PATH:$BIN\"" >> "$CLAUDE_ENV_FILE"
"$BIN/graphify" update . >/dev/null 2>&1
exit 0
