export const meta = {
  name: 'planche',
  description: "Fait une planche de design : directeur-artistique (Opus, trois pistes) → maquettiste (Sonnet, HTML + captures) → critique-design et regard en parallèle → une reprise si besoin. Ne commite pas, ne publie pas.",
  whenToUse: "Au début d'une demande qui change l'apparence ou l'organisation des écrans (CLAUDE.md « Design »), avant la spec. La conversation principale relit, regarde les captures, publie la planche en artefact et pose les questions à Timothée.",
  phases: [
    { title: 'Pistes', detail: 'directeur-artistique : trois pistes, la recommandée, les questions' },
    { title: 'Maquette', detail: 'maquettiste : planche HTML et captures', model: 'sonnet' },
    { title: 'Critique', detail: 'critique-design et regard, en parallèle', model: 'sonnet' },
    { title: 'Reprise', detail: 'maquettiste reprend une fois ce que la critique juge à reprendre', model: 'sonnet' },
  ],
}

// args : { sujet: "accueil-musiciens" (sert au nom de fichier), demande: "ce que Timothée veut, ses mots",
//          ecrans: "pages ou composants concernés (chemins)", captures?: ["chemins de PNG de l'existant"],
//          contraintes?: "décisions déjà prises, pistes imposées ou écartées" }
const A = args || {}
if (!A.sujet || !A.demande || !A.ecrans) throw new Error('args attendus : { sujet, demande, ecrans, captures?, contraintes? }')
if (!/^[a-z0-9-]+$/.test(A.sujet)) throw new Error('sujet : minuscules, chiffres et tirets seulement (il sert de nom de fichier)')
const fichier = `docs/planches/planche-${A.sujet}.html`
const dossier = `test-results/planches/${A.sujet}`

const PISTES = {
  type: 'object',
  properties: {
    pistes: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string' }, idee: { type: 'string' }, palette: { type: 'string' }, typo: { type: 'string' },
          matieres: { type: 'string' }, mouvement: { type: 'string' }, dispositions: { type: 'string' }, risque: { type: 'string' },
        },
        required: ['nom', 'idee', 'palette', 'typo', 'matieres', 'mouvement', 'dispositions', 'risque'],
      },
    },
    recommandee: { type: 'string', description: 'nom de la piste recommandée' },
    pourquoi: { type: 'string' },
    cout: { type: 'string', description: 'fichiers touchés et ampleur si on la code' },
    questions: { type: 'array', items: { type: 'string' }, description: 'question — proposition' },
    non_vu: { type: 'array', items: { type: 'string' } },
  },
  required: ['pistes', 'recommandee', 'pourquoi', 'cout', 'questions', 'non_vu'],
}
const MAQUETTE = {
  type: 'object',
  properties: {
    planche: { type: 'string' },
    captures: { type: 'array', items: { type: 'string' } },
    corrige: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['planche', 'captures', 'corrige', 'questions'],
}
const CRITIQUE = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['a_reprendre', 'a_retoucher', 'bon'] },
    points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          preuve: { type: 'string', description: 'capture + endroit, ou chemin:ligne' },
          constat: { type: 'string' },
          gravite: { type: 'string', enum: ['premier_coup_d_oeil', 'de_pres', 'finition', 'gele'] },
          correction: { type: 'string' },
        },
        required: ['preuve', 'constat', 'gravite', 'correction'],
      },
    },
    qualites: { type: 'array', items: { type: 'string' } },
    non_verifie: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'points', 'qualites', 'non_verifie'],
}

phase('Pistes')
const pistes = await agent(
  `Planche « ${A.sujet} ».\n\nDEMANDE DE TIMOTHÉE :\n${A.demande}\n\nÉCRANS CONCERNÉS : ${A.ecrans}\n` +
  (A.captures?.length ? `CAPTURES DE L'EXISTANT : ${A.captures.join(', ')}\n` : '') +
  (A.contraintes ? `DÉCISIONS DÉJÀ PRISES : ${A.contraintes}\n` : ''),
  { agentType: 'directeur-artistique', schema: PISTES, label: 'pistes', phase: 'Pistes' })
if (!pistes) throw new Error('Le directeur artistique n’a rien rendu.')

const consigneMaquette =
  `Planche « ${A.sujet} » : écris ${fichier}, captures dans ${dossier}/.\n\nDEMANDE : ${A.demande}\nÉCRANS : ${A.ecrans}\n\n` +
  `PISTES DÉCIDÉES (à rendre telles quelles, la recommandée marquée) :\n${JSON.stringify(pistes, null, 1)}`

phase('Maquette')
let maquette = await agent(consigneMaquette, { agentType: 'maquettiste', schema: MAQUETTE, label: 'maquette', phase: 'Maquette' })
if (!maquette) throw new Error('Le maquettiste n’a rien rendu.')

const critiquer = (m, n) => parallel([
  () => agent(
    `Critique la planche ${m.planche} (sujet « ${A.sujet} », demande : ${A.demande}). Captures : ${m.captures.join(', ')}. ` +
    `Pistes et recommandation du directeur artistique :\n${JSON.stringify(pistes, null, 1)}\n\n` +
    `Juge aussi la planche en tant que planche : les trois pistes sont-elles vraiment différentes, aussi soignées l'une que l'autre, et la recommandée tient-elle face aux deux autres ?`,
    { agentType: 'critique-design', schema: CRITIQUE, label: `critique:${n}`, phase: 'Critique' }),
  () => agent(
    `Regarde ces captures d'une planche de design (pas du site : des maquettes de pistes côte à côte, en clair et en sombre) : ${m.captures.join(', ')}.`,
    { agentType: 'regard', label: `regard:${n}`, phase: 'Critique' }),
])

let [critique, regard] = await critiquer(maquette, 1)
let reprise = false
if (critique && critique.verdict === 'a_reprendre') {
  phase('Reprise')
  const aCorriger = critique.points.filter(p => p.gravite !== 'gele' && p.gravite !== 'finition')
  log(`Reprise : ${aCorriger.length} point(s) ; les points « finition » et « gelé » vont à la conversation principale.`)
  const m2 = await agent(
    `${consigneMaquette}\n\nLa planche existe déjà (${maquette.planche}). Corrige-la selon la critique, sans changer les pistes ni la recommandation, puis refais toutes les captures :\n` +
    `${JSON.stringify(aCorriger, null, 1)}\n\nCe que le regard a vu :\n${regard || '(rien)'}`,
    { agentType: 'maquettiste', schema: MAQUETTE, label: 'reprise', phase: 'Reprise' })
  if (m2) {
    maquette = m2
    reprise = true
    const [c2, r2] = await critiquer(maquette, 2)
    if (c2) critique = c2
    if (r2) regard = r2
  }
}

return { sujet: A.sujet, pistes, maquette, critique, regard, reprise }
