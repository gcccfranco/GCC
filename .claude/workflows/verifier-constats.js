export const meta = {
  name: 'verifier-constats',
  description: "Contre-vérifie une liste de constats (audit, revue, bug signalé) : un relecteur Sonnet par constat cherche à le réfuter sur la tête de branche.",
  whenToUse: "Avant qu'un constat entre dans un rapport, une spec ou la feuille de route ; quand des corrections arrivent pendant l'audit (le constat est relu sur origin).",
  phases: [{ title: 'Réfuter', model: 'sonnet' }],
}

// args : { base: "<commit audité>", constats: [{ titre, severite, preuves: ["chemin:ligne — …"], impact }] }
const A = args || {}
if (!A.base || !Array.isArray(A.constats)) throw new Error('args attendus : { base, constats: [...] }')

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirme', 'refute', 'incertain', 'deja_corrige'] },
    severite: { type: 'string', enum: ['P1', 'P2', 'P3'] },
    raison: { type: 'string' },
    preuve: { type: 'string' },
  },
  required: ['verdict', 'severite', 'raison', 'preuve'],
}

phase('Réfuter')
const verdicts = await parallel(A.constats.map((c, i) => () => agent(
  `Constat d'audit (relevé au commit ${A.base}) à réfuter si possible :\n${JSON.stringify(c, null, 1)}\n\n` +
  `Vérifie aussi s'il est déjà corrigé : \`git fetch -q origin ui/apple-design\` puis \`git diff ${A.base} origin/ui/apple-design -- <fichiers cités>\` (verdict deja_corrige).`,
  { agentType: 'relecteur', schema: VERDICT, label: `refuter:${i + 1}:${String(c.titre).slice(0, 30)}` })
  .then((v) => ({ ...c, verif: v }))))

return verdicts.filter(Boolean)
