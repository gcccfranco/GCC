#!/usr/bin/env bash
# Orchestrateur du chantier « équipes et groupes » : un passage `claude -p` par tranche, à contexte neuf.
# L'exécutant (Sonnet) code et consulte un advisor (Opus) ; la revue de chaque lot est faite par Opus.
# Reprend où il s'était arrêté : un passage est fait quand son commit est sur la branche. Voir README.md.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 2
ICI=scripts/chantier
BRANCHE=ui/apple-design

EXECUTANT=${ORCH_EXECUTANT:-claude-sonnet-5-5}
ADVISOR=${ORCH_ADVISOR:-claude-opus-5-5}
EFFORT=${ORCH_EFFORT:-medium}
RELECTEUR=${ORCH_RELECTEUR:-claude-opus-5-5}
EFFORT_REVUE=${ORCH_EFFORT_REVUE:-high}
PLAFOND_TRANCHE=${ORCH_PLAFOND_TRANCHE:-5}   # dollars par passage
PLAFOND_REVUE=${ORCH_PLAFOND_REVUE:-8}
BUDGET=${ORCH_BUDGET:-90}                    # dollars au prix catalogue, cumulés d'un lancement à l'autre (journal)
ESSAIS_MAX=${ORCH_ESSAIS_MAX:-2}             # essais par passage et par lancement
LIMITE_MIN=${ORCH_LIMITE_MIN:-0}             # 0 = sans limite ; sinon le script rend la main avant (outil limité à 2 h)
MARGE_MIN=${ORCH_MARGE_MIN:-50}              # pas de nouveau passage s'il reste moins que ça
SEUL=${ORCH_SEUL:-}                          # ex. EQ-C : ce passage seulement
ESSAI=${ORCH_ESSAI:-0}                       # 1 = à blanc : montre le plan et la consigne du prochain passage

DOSSIER=${ORCH_DOSSIER:-$HOME/.orchestrateur-chantier}
JOURNAL=$DOSSIER/journal.tsv
mkdir -p "$DOSSIER/sorties"
DEBUT=$(date +%s)

dire() { echo "[orchestrateur $(date +%H:%M)] $*"; }
arret() { dire "ARRÊT : $*"; exit 1; }

exec 9>"$DOSSIER/verrou"
flock -n 9 || { dire "ARRÊT : un orchestrateur tourne déjà"; exit 2; }

[ "$(git branch --show-current)" = "$BRANCHE" ] || arret "pas sur la branche $BRANCHE"

# Le passage imbriqué ne doit rien hériter de la session Claude Code qui le lance (sinon il refuse de démarrer
# ou parle à la session hôte) ; les proxys, les certificats et NEXT_PUBLIC_* restent. ANTHROPIC_API_KEY est retirée :
# tout se paie sur le forfait claude.ai, dont l'usage se voit dans ses réglages (choix de Timothée du 12/10/2026).
SANS=()
while IFS= read -r v; do SANS+=(-u "$v"); done < <(env | cut -d= -f1 |
  grep -E '^(CLAUDECODE|CLAUDE_|CCR_|ANTHROPIC_API_KEY$|ANTHROPIC_BASE_URL$|ANTHROPIC_AUTH_TOKEN$|SESSION_INGRESS_URL$|MAX_THINKING_TOKENS$|TRACEPARENT$|SBX_TELEMETRY_SOCKET$)')
claude_neuf() { env "${SANS[@]}" CLAUDE_CONFIG_DIR="$DOSSIER/claude" claude "$@"; }

depense() { [ -f "$JOURNAL" ] && awk -F'\t' '{s+=$6} END{printf "%.2f", s}' "$JOURNAL" || echo 0; }
reste_s() { [ "$LIMITE_MIN" = 0 ] && echo 999999 || echo $(( LIMITE_MIN * 60 - ($(date +%s) - DEBUT) )); }
fait() { git log --format=%s HEAD | awk -v p="$1 $2 : " 'index($0, p) == 1 { f = 1 } END { exit !f }'; }
remettre() { git checkout -- next-env.d.ts tsconfig.json 2>/dev/null || true; }

pousser() {
  local i
  for i in 1 2 3 4; do
    remettre
    if git pull --rebase -q origin "$BRANCHE" && git push -q origin "$BRANCHE"; then return 0; fi
    git rebase --abort 2>/dev/null
    sleep $(( 2 ** i ))
  done
  return 1
}

consigne() { # étiquette tranche spec note -> texte
  python3 - "$ICI" "$@" <<'PY'
import sys, datetime
ici, etq, tr, spec, note = sys.argv[1:6]
modele = "consigne-revue.md" if tr == "REVUE" else "consigne-tranche.md"
texte = open(f"{ici}/{modele}", encoding="utf-8").read()
for cle, val in {"ETIQUETTE": etq, "TRANCHE": tr, "SPEC": spec, "NOTE": note,
                 "DATE": datetime.date.today().strftime("%d/%m/%Y")}.items():
    texte = texte.replace("{{" + cle + "}}", val)
print(texte.replace("\n\n\n", "\n\n"))
PY
}

lire_sortie() { # fichier json -> "issue<TAB>cout<TAB>résultat"
  python3 - "$1" <<'PY'
import sys, json
try:
    d = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    print("illisible\t0\t(pas de sortie JSON : passage coupé ?)"); sys.exit()
cout = d.get("total_cost_usd") or 0
issue = d.get("subtype") or ("erreur" if d.get("is_error") else "?")
print(f"{issue}\t{cout:.2f}\t{(d.get('result') or '').strip()}")
PY
}

# --- Avant de commencer
if [ "$ESSAI" != 1 ]; then
  AUTH=$(claude_neuf auth status 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("authMethod") if d.get("loggedIn") else "aucune")' 2>/dev/null)
  case "$AUTH" in oauth*|claude*) ;; *) arret "Claude Code n'est pas connecté au forfait claude.ai (méthode : ${AUTH:-?})" ;; esac
  [ -d node_modules ] || npm ci --silent || arret "npm ci a échoué"
  npx playwright install chromium >/dev/null 2>&1 || dire "attention : installation de Chromium pour Playwright en échec"
  remettre
  [ -z "$(git status --porcelain --untracked-files=no)" ] || dire "l'arbre contient du travail non commité : le prochain passage en repartira"
  git pull --rebase -q origin "$BRANCHE" 2>/dev/null || dire "pull impossible (arbre modifié ?) : on part de la branche locale"
fi

# --- La file
while IFS='|' read -r -u 3 ETQ TR SPEC NOTE; do
  case "$ETQ" in ''|'#'*) continue ;; esac
  [ -n "$SEUL" ] && [ "$TR" != "$SEUL" ] && continue
  if fait "$ETQ" "$TR"; then continue; fi

  if [ "$ESSAI" = 1 ]; then
    dire "prochain passage : $ETQ $TR (dépensé selon le journal : $(depense) \$ sur $BUDGET \$)"
    consigne "$ETQ" "$TR" "$SPEC" "$NOTE"
    exit 0
  fi

  if [ "$TR" = REVUE ]; then
    MODELE=$RELECTEUR; AVEC=(); EFF=$EFFORT_REVUE; PLAFOND=$PLAFOND_REVUE
  else
    MODELE=$EXECUTANT; AVEC=(--advisor "$ADVISOR"); EFF=$EFFORT; PLAFOND=$PLAFOND_TRANCHE
  fi

  essai=1
  while :; do
    awk -v d="$(depense)" -v p="$PLAFOND" -v b="$BUDGET" 'BEGIN { exit !(d + p <= b) }' ||
      arret "budget : $(depense) \$ dépensés, un passage de plus pourrait dépasser $BUDGET \$"
    (( $(reste_s) >= MARGE_MIN * 60 )) || { dire "RELANCER : temps du lancement presque écoulé (prochain : $ETQ $TR)"; exit 3; }

    dire "$ETQ $TR, essai $essai : $MODELE${AVEC[*]:+ + advisor $ADVISOR}, effort $EFF, plafond $PLAFOND \$"
    SORTIE="$DOSSIER/sorties/$ETQ-$TR-$(date +%m%d-%H%M).json"
    t0=$(date +%s)
    consigne "$ETQ" "$TR" "$SPEC" "$NOTE" |
      timeout "$(( $(reste_s) - 120 ))s" env "${SANS[@]}" CLAUDE_CONFIG_DIR="$DOSSIER/claude" \
        claude -p --model "$MODELE" "${AVEC[@]}" --effort "$EFF" --max-budget-usd "$PLAFOND" \
        --permission-mode acceptEdits --allowedTools "Bash,Skill" --disallowedTools "Bash(git push *),Agent" \
        --output-format json > "$SORTIE" 2> "$SORTIE.err"
    IFS=$'\t' read -r ISSUE COUT RESULTAT < <(lire_sortie "$SORTIE" | head -1)
    RESULTAT=$(lire_sortie "$SORTIE" | cut -f3- )
    MIN=$(( ($(date +%s) - t0) / 60 ))
    remettre
    [ "$(git branch --show-current)" = "$BRANCHE" ] || arret "le passage a changé de branche"

    if fait "$ETQ" "$TR"; then
      if ! npx tsc --noEmit >/dev/null 2>&1; then
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "$ETQ" "$TR" "$essai" "tsc-rouge" "$COUT" "$MIN" "$(git rev-parse --short HEAD)" >> "$JOURNAL"
        arret "$ETQ $TR committé mais npx tsc --noEmit échoue : commit gardé en local, non poussé"
      fi
      pousser || arret "push impossible après 4 essais (conflit avec une autre session ?) : commit gardé en local"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "$ETQ" "$TR" "$essai" "fait" "$COUT" "$MIN" "$(git rev-parse --short HEAD)" >> "$JOURNAL"
      dire "$ETQ $TR fait et poussé ($COUT \$, $MIN min ; total $(depense) \$)"
      echo "$RESULTAT" | sed 's/^/    /'
      break
    fi

    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "$ETQ" "$TR" "$essai" "$ISSUE" "$COUT" "$MIN" "-" >> "$JOURNAL"
    dire "$ETQ $TR pas fini ($ISSUE, $COUT \$, $MIN min)"
    echo "$RESULTAT" | sed 's/^/    /'
    if [ "$ISSUE" != success ] && grep -q -i -E "limit|usage" <<< "$RESULTAT"; then
      arret "limite du forfait atteinte ($ETQ $TR) : relancer après sa remise à zéro, le travail est dans l'arbre"
    fi
    (( essai < ESSAIS_MAX )) || arret "$ETQ $TR pas fini après $essai essais : le travail est dans l'arbre, à regarder"
    essai=$(( essai + 1 ))
  done
done 3< "$ICI/file.txt"

dire "FINI : toute la file est faite (dépensé selon le journal : $(depense) \$)"
