#!/usr/bin/env python3
"""Contexte de départ des sous-agents d'une session Claude Code, lu dans leurs transcriptions.

Pour chaque agent lancé dans la session : les jetons d'entrée de sa première requête, ses outils, et la taille en
caractères de chaque pièce de son contexte (définitions d'outils, liste des skills, CLAUDE.md, outils différés,
skills préchargés, consigne). N'affiche jamais le contenu. Mesures : docs/orchestration.md § 7.

    python3 scripts/mesure-contexte-agents.py             # la session la plus récente de ce dépôt
    python3 scripts/mesure-contexte-agents.py <dossier>   # un dossier de session ou de transcriptions
"""
import glob
import json
import os
import sys


def taille(x):
    return len(x) if isinstance(x, str) else len(json.dumps(x, ensure_ascii=False))


def dossier_par_defaut():
    projet = os.path.expanduser('~/.claude/projects/' + os.getcwd().replace('/', '-'))
    sessions = [d for d in glob.glob(os.path.join(projet, '*')) if os.path.isdir(d)]
    if not sessions:
        sys.exit(f'aucune session sous {projet}')
    return max(sessions, key=os.path.getmtime)


def mesurer(meta):
    r = {'agent': json.load(open(meta)).get('agentType'), 'modele': '', 'entree': 0, 'outils': [], 'car_outils': 0,
         'skills': 0, 'claude_md': 0, 'differes': 0, 'precharge': 0, 'consigne': 0}
    demande_vue = False  # le premier message est la demande faite à l'agent, pas un skill préchargé
    for ligne in open(meta.replace('.meta.json', '.jsonl')):
        d = json.loads(ligne)
        piece = d.get('attachment') if d.get('type') == 'attachment' else None
        message = d.get('message') if isinstance(d.get('message'), dict) else {}
        if isinstance(piece, dict):
            rendu = taille(d['rendered']) if d.get('rendered') is not None else 0
            if piece.get('type') == 'prompt_snapshot':
                r['consigne'] = taille(piece.get('systemPrompt'))
                if 'tools' in piece and not r['outils']:
                    r['outils'] = [o.get('name') for o in piece['tools']]
                    r['car_outils'] = taille(piece['tools'])
            elif piece.get('type') == 'skill_listing':
                r['skills'] += rendu
            elif piece.get('type') == 'instructions':
                r['claude_md'] += rendu
            elif piece.get('type') == 'deferred_tools_delta':
                r['differes'] += rendu
        elif d.get('type') == 'user' and not r['entree']:
            if demande_vue and taille(message.get('content')) > 2000:
                r['precharge'] += taille(message.get('content'))  # un skill du champ `skills:` arrive en message entier
            demande_vue = True
        elif d.get('type') == 'assistant' and message.get('usage') and not r['entree']:
            u = message['usage']
            r['entree'] = sum(u.get(k) or 0 for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))
            r['modele'] = message.get('model')
    return r


dossier = sys.argv[1] if len(sys.argv) > 1 else dossier_par_defaut()
metas = sorted(glob.glob(os.path.join(dossier, '**', 'agent-*.meta.json'), recursive=True), key=os.path.getmtime)
if not metas:
    sys.exit(f'aucune transcription d\'agent sous {dossier}')
mesures = [mesurer(m) for m in metas]

print(f'{dossier}\n')
print(f"{'agent':22} {'modèle':18} {'entrée':>7} {'outils':>6} {'MCP':>4} | caractères : {'outils':>7} {'skills':>7} "
      f"{'CLAUDE.md':>9} {'différés':>8} {'préchargé':>9} {'consigne':>8}")
for r in mesures:
    mcp = sum(1 for o in r['outils'] if o.startswith('mcp__'))
    print(f"{str(r['agent']):22} {str(r['modele']):18} {r['entree']:7} {len(r['outils']):6} {mcp:4} |              "
          f"{r['car_outils']:7} {r['skills']:7} {r['claude_md']:9} {r['differes']:8} {r['precharge']:9} {r['consigne']:8}")
print()
for r in mesures:
    print(f"{r['agent']} : {', '.join(sorted(o for o in r['outils'] if not o.startswith('mcp__'))) or 'aucun outil relevé'}")
