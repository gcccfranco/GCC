export const meta = {
  name: 'tranche',
  description: "Code une tranche déjà décidée : executant (Sonnet) → testeur (Haiku) → corrections (≤ 2) → conseil Opus si ça résiste → relecteur (Sonnet). Ne commite pas.",
  whenToUse: "Après un go de Timothée sur un lot dont la spec découpe les tranches. Une tranche par appel : la conversation principale relit le diff, regarde les captures et commite entre deux.",
  phases: [
    { title: 'Coder', detail: 'executant applique la consigne', model: 'sonnet' },
    { title: 'Tester', detail: 'tsc, lint, specs nommées sur les appareils du projet', model: 'haiku' },
    { title: 'Corriger', detail: 'executant reprend les échecs, deux tours au plus', model: 'sonnet' },
    { title: 'Conseil', detail: 'Opus diagnostique la cause si deux tours ne suffisent pas' },
    { title: 'Relire', detail: 'relecteur : diff contre spec et règles du CLAUDE.md', model: 'sonnet' },
  ],
}

// args : { spec: "docs/spec-x.md", tranche: "T2", consigne: "quoi, où, critères", tests: ["tests/x.spec.ts"], base: "<commit avant la tranche>",
//          preuve?: "essai réel à faire par le testeur, p. ex. banc horsligne sur build de production (scripts/rude-epreuve/README.md)" }
// `preuve` : obligatoire dès qu'une tranche touche le service worker, le hors ligne, les notifications ou les droits — les tests
// simulés n'ont pas vu, le 24/10/2026, une setlist ouverte par un lien jamais gardée hors ligne.
// Patron « orchestrateur-ouvriers » : la conversation principale (Opus) a décidé ; Sonnet code, Haiku lance
// les tests, Opus n'est rappelé qu'en conseiller quand ça résiste (stratégie « advisor »).
const A = args || {}
if (!A.spec || !A.tranche || !A.consigne || !A.base) {
  throw new Error('args attendus : { spec, tranche, consigne, tests: [...], base }')
}
const tests = (A.tests || []).join(' ')

const ECHECS = {
  type: 'object',
  properties: {
    commande: { type: 'string' },
    passes: { type: 'integer' },
    echecs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          test: { type: 'string' }, projets: { type: 'string' }, erreur: { type: 'string' }, lieu: { type: 'string' },
          course: { type: 'boolean', description: 'rouge sur un appareil différent d une passe à l autre' },
        },
        required: ['test', 'projets', 'erreur', 'lieu', 'course'],
      },
    },
    captures: { type: 'array', items: { type: 'string' } },
  },
  required: ['commande', 'passes', 'echecs', 'captures'],
}
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['bon', 'a_corriger', 'bloquant'] },
    points: { type: 'array', items: { type: 'string' }, description: 'chemin:ligne — ce qui cloche' },
    non_verifie: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'points', 'non_verifie'],
}

const tester = (n) => agent(
  `Tranche ${A.tranche} (${A.spec}). Lance, dans l'ordre : \`npx tsc --noEmit\`, \`npm run lint\` (les avertissements ne comptent pas), puis ` +
  (tests ? `\`npx playwright test ${tests} --reporter=line\` (les projets de playwright.config.ts : trois appareils, cinq pour une spec d'agencement).` : 'aucune spec Playwright (rien de nommé).') +
  ` Ajoute à la passe Playwright les **specs voisines** : pour chaque fichier de \`git diff --name-only ${A.base}\`, les specs de tests/ qui citent son chemin ou son nom (\`grep -rlF\`), car une spec qui lit le code par texte casse au moindre changement de forme. **Huit au plus** : d'abord celles qui lisent le fichier par texte (readFileSync, fs), puis celles qui l'importent ; laisse celles qui ne font que naviguer vers une page (la suite complète de fin de lot les couvre). Au tour 1, liste-les dans \`commande\`, et dis celles que tu as laissées.` +
  (A.preuve ? ` Puis fais la preuve réelle demandée, et compte chaque écart comme un échec : ${A.preuve}` : '') +
  ` Rends chaque échec ; une erreur tsc ou lint compte comme un échec.`,
  { agentType: 'testeur', schema: ECHECS, label: `tester:${A.tranche}:${n}`, phase: 'Tester' })

phase('Coder')
const code = await agent(
  `Tranche ${A.tranche} de ${A.spec} (lis la spec pour le contexte, la consigne ci-dessous fait foi).\n\nCONSIGNE DÉCIDÉE :\n${A.consigne}\n\nTests de la tranche : ${tests || 'aucun nommé'}.`,
  { agentType: 'executant', label: `coder:${A.tranche}`, phase: 'Coder' })

let t = await tester(1)
let tours = 0
while (t && t.echecs.length && tours < 2) {
  tours++
  await agent(
    `Tranche ${A.tranche} (${A.spec}). Les vérifications échouent :\n${JSON.stringify(t.echecs, null, 1)}\n\n` +
    `Corrige dans le périmètre de la consigne de départ :\n${A.consigne}\n\nUn échec marqué course, ou dans un test étranger à la tranche : n'y touche pas, rends-le en question. Ne désactive, n'ignore et n'affaiblis aucun test.`,
    { agentType: 'executant', label: `corriger:${A.tranche}:${tours}`, phase: 'Corriger' })
  t = await tester(tours + 1)
}

let conseil = null
if (t && t.echecs.length) {
  // Conseiller : modèle de la session (Opus), lecture et diagnostic seulement.
  conseil = await agent(
    `Deux tours de correction n'ont pas suffi pour la tranche ${A.tranche} (${A.spec}). Échecs restants :\n${JSON.stringify(t.echecs, null, 1)}\n\n` +
    `Trouve la cause racine (git diff ${A.base}, le test, le composant), sans rien modifier. Rends : la cause en deux phrases, la correction précise (fichier, ligne, quoi), et si l'échec ne vient pas de la tranche.`,
    { label: `conseil:${A.tranche}`, phase: 'Conseil', effort: 'high' })
  await agent(
    `Applique exactement ce diagnostic pour la tranche ${A.tranche} (${A.spec}) :\n${conseil}`,
    { agentType: 'executant', label: `appliquer-conseil:${A.tranche}`, phase: 'Corriger' })
  t = await tester(tours + 2)
}

const relu = await agent(
  `Relis \`git diff ${A.base}\` (tranche ${A.tranche} de ${A.spec}). Consigne qui a été donnée :\n${A.consigne}`,
  { agentType: 'relecteur', schema: VERDICT, label: `relire:${A.tranche}`, phase: 'Relire' })

return { tranche: A.tranche, code, tests: t, tours, conseil, relu }
