export const meta = {
  name: 'verifier-constats',
  description: "Contre-vérifie une liste de constats (audit, revue, bug signalé) : un relecteur Sonnet par constat (par lot de cinq au plus quand ils citent le même fichier) cherche à le réfuter sur la tête de branche.",
  whenToUse: "Avant qu'un constat entre dans un rapport, une spec ou la feuille de route ; quand des corrections arrivent pendant l'audit (le constat est relu sur origin).",
  phases: [{ title: 'Réfuter', model: 'sonnet' }],
}

// args : { base: "<commit audité>", constats: [{ titre, severite, preuves: ["chemin:ligne — …"], impact }],
//          branche?: "branche d'origin où chercher une correction déjà faite (défaut : main)" }
const A = args || {}
if (!A.base || !Array.isArray(A.constats)) throw new Error('args attendus : { base, constats: [...], branche? }')
// 10/11/2026 : `ui/apple-design` est fusionnée dans main (CLAUDE.md, 29/10/2026) et n'existe plus sur origin ; le diff échouait.
const BRANCHE = A.branche || 'main'
if (!/^[\w./-]+$/.test(BRANCHE)) throw new Error('branche : nom de branche git attendu')

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
const VERDICTS_LOT = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: { ...VERDICT, properties: { index: { type: 'integer' }, ...VERDICT.properties }, required: ['index', ...VERDICT.required] },
    },
  },
  required: ['verdicts'],
}
const DEJA = `Vérifie aussi s'il est déjà corrigé : \`git fetch -q origin ${BRANCHE}\` puis \`git diff ${A.base} origin/${BRANCHE} -- <fichiers cités>\` (verdict deja_corrige).`

// 10/11/2026 (go efficience de Timothée, règle proposée) : les constats qui citent le même fichier (première preuve) partent ensemble, cinq au
// plus par relecteur — il relit le fichier une fois ; un constat seul sur son fichier garde son relecteur.
const fichierDe = (c) => (String((c.preuves || [])[0] || '').match(/[\w@()[\]./-]+\.[A-Za-z]+/) || [])[0] || ''
const groupes = new Map()
A.constats.forEach((c, i) => {
  const cle = fichierDe(c) || `seul:${i}`
  if (!groupes.has(cle)) groupes.set(cle, [])
  groupes.get(cle).push({ c, i })
})
const lots = [...groupes.values()].flatMap((g) => {
  const parts = []
  for (let k = 0; k < g.length; k += 5) parts.push(g.slice(k, k + 5))
  return parts
})

const verifierUn = ({ c, i }) => agent(
  `Constat d'audit (relevé au commit ${A.base}) à réfuter si possible :\n${JSON.stringify(c, null, 1)}\n\n${DEJA}`,
  { agentType: 'relecteur', schema: VERDICT, label: `refuter:${i + 1}:${String(c.titre).slice(0, 30)}` })
  .then((v) => [{ i, r: { ...c, verif: v } }])

const verifierLot = (lot) => agent(
  `${lot.length} constats d'audit (relevés au commit ${A.base}) qui citent le même fichier. Réfute CHACUN si possible, indépendamment des autres : un verdict par constat, avec son \`index\`.\n\n` +
  lot.map(({ c }, k) => `index ${k} :\n${JSON.stringify(c, null, 1)}`).join('\n\n') + `\n\n${DEJA}`,
  { agentType: 'relecteur', schema: VERDICTS_LOT, label: `refuter-lot:${lot.map(({ i }) => i + 1).join(',')}` })
  .then((res) => lot.map(({ c, i }, k) => {
    const v = ((res && res.verdicts) || []).find((x) => x.index === k)
    if (!v) return { i, r: { ...c, verif: { verdict: 'incertain', severite: c.severite, raison: 'pas de verdict rendu', preuve: '' } } }
    const { index, ...verif } = v
    return { i, r: { ...c, verif } }
  }))

phase('Réfuter')
const rendus = await parallel(lots.map((lot) => () => (lot.length === 1 ? verifierUn(lot[0]) : verifierLot(lot))))

return rendus.filter(Boolean).flat().sort((a, b) => a.i - b.i).map((x) => x.r)
