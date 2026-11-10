export const meta = {
  name: 'tranche',
  description: "Code une tranche déjà décidée : executant (Sonnet) → testeur (Haiku) → corrections (≤ 2) → conseil Opus si ça résiste → relecteur (Sonnet). Ne commite pas.",
  whenToUse: "Après un go de Timothée sur un lot dont la spec découpe les tranches. Une tranche par appel : la conversation principale lit le verdict, ouvre les passages et captures signalés et commite entre deux.",
  phases: [
    { title: 'Coder', detail: 'executant applique la consigne, se vérifie par tsc', model: 'sonnet' },
    { title: 'Tester', detail: 'tsc, lint, specs nommées sur les appareils du projet', model: 'haiku' },
    { title: 'Corriger', detail: 'executant reprend les échecs, deux tours au plus', model: 'sonnet' },
    { title: 'Conseil', detail: 'Opus diagnostique la cause si deux tours ne suffisent pas' },
    { title: 'Relire', detail: 'relecteur : diff contre spec et règles du CLAUDE.md', model: 'sonnet' },
  ],
}

// args : { spec: "docs/spec-x.md", tranche: "T2", consigne: "quoi, où, critères", tests: ["tests/x.spec.ts"], base: "<commit avant la tranche>",
//          echecsConnus?: ["tests/x.spec.ts:52 (rouge sur la base)"],
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
// (go efficience de Timothée, 10/11/2026, règle proposée) De la spec, un ouvrier ne lit que la section de sa tranche : les specs font jusqu'à 180 000 caractères.
const SECTION = `de la spec, ne lis que la section de la tranche (\`grep -n '^#' ${A.spec}\` puis la plage par \`sed -n 'a,bp'\`), jamais le fichier entier ; la consigne ci-dessous fait foi`

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

// 03/11/2026 (Timothée, « oui pour 1, 2, 3, 4 ») : le testeur attend la fin de Playwright (le premier tour du lot CD
// rendait son bilan pendant que la suite tournait, et toute la suite repartait au tour 2) ; à partir du tour 2 il ne
// relance que les specs rouges ; les specs voisines se bornent à celles qui lisent un fichier du diff par texte, quatre
// au plus (la suite complète de fin de lot couvre le reste) ; `echecsConnus` (args) liste les échecs déjà rouges sur la
// base, qui ne comptent pas.
const connus = (A.echecsConnus || []).join(' ; ')
const tester = (n, rouges) => agent(
  `Tranche ${A.tranche} (${A.spec}). Avant tout, vérifie qu'aucun \`next dev\` ni \`playwright test\` ne reste d'une passe précédente (\`pgrep -af "next dev|playwright test"\`) ; s'il en reste, arrête-les (\`pkill -f\`) : un serveur orphelin sur 3100/3101 ralentit ou bloque la suite. ` +
  `Lance, dans l'ordre : \`npx tsc --noEmit\`, \`npm run lint\` (les avertissements ne comptent pas), puis ` +
  (rouges && rouges.length
    ? `seulement les specs restées rouges au tour précédent : \`npx playwright test ${rouges.join(' ')} --reporter=line\`.`
    : (tests ? `\`npx playwright test ${tests} --reporter=line\` (les projets de playwright.config.ts : trois appareils, cinq pour une spec d'agencement).` : 'aucune spec Playwright (rien de nommé).') +
      ` Ajoute à la passe les **specs voisines** : pour chaque fichier de \`git diff --name-only ${A.base}\`, les specs de tests/ qui le **lisent par texte** (readFileSync, fs, avec son chemin) — pas celles qui l'importent ou naviguent vers sa page. **Quatre au plus** ; liste-les dans \`commande\`, et dis celles que tu as laissées.`) +
  ` **Attends la fin de la commande Playwright** avant de rendre ton bilan (sortie dans un fichier, \`timeout\` long, puis lecture par \`grep\`/\`tail\`) : un bilan rendu pendant que la suite tourne est faux.` +
  (A.preuve ? ` Puis fais la preuve réelle demandée, et compte chaque écart comme un échec : ${A.preuve}` : '') +
  (connus ? ` Échecs déjà rouges sur la base, à ne PAS rendre comme échecs (cite-les dans \`commande\` s'ils réapparaissent) : ${connus}.` : '') +
  ` Rends chaque autre échec ; une erreur tsc ou lint compte comme un échec. Un échec qui passe quand tu relances sa spec seule est une course : marque-le \`course\`.`,
  { agentType: 'testeur', schema: ECHECS, label: `tester:${A.tranche}:${n}`, phase: 'Tester' })
const specsRouges = (r) => [...new Set(r.echecs.map((e) => (e.lieu.match(/tests\/[^\s:]+\.spec\.ts/) || [])[0]).filter(Boolean))]

phase('Coder')
const code = await agent(
  // (go efficience de Timothée, 10/11/2026, règle proposée) L'executant ne lance plus Playwright ni next dev : l'attente dépasse la durée de son cache et tout son
  // contexte se réécrit ; le testeur (Haiku) lance les specs tout de suite après.
  `Tranche ${A.tranche} de ${A.spec} : ${SECTION}.\n\nCONSIGNE DÉCIDÉE :\n${A.consigne}\n\nTests de la tranche : ${tests || 'aucun nommé'} (pour mémoire : ne les lance pas). Pour te vérifier, lance seulement \`npx tsc --noEmit\` (ou \`npm run validate\` si tu n'as touché que des .cho) ; jamais Playwright ni \`next dev\` : le testeur lance les specs juste après toi.`,
  { agentType: 'executant', label: `coder:${A.tranche}`, phase: 'Coder' })

let t = await tester(1)
let tours = 0
while (t && t.echecs.filter((e) => !e.course).length && tours < 2) {
  tours++
  await agent(
    `Tranche ${A.tranche} (${A.spec}). Les vérifications échouent :\n${JSON.stringify(t.echecs, null, 1)}\n\n` +
    `Corrige dans le périmètre de la consigne de départ :\n${A.consigne}\n\nUn échec marqué course, ou dans un test étranger à la tranche : n'y touche pas, rends-le en question. Ne désactive, n'ignore et n'affaiblis aucun test.`,
    { agentType: 'executant', label: `corriger:${A.tranche}:${tours}`, phase: 'Corriger' })
  t = await tester(tours + 1, specsRouges(t))
}

let conseil = null
if (t && t.echecs.filter((e) => !e.course).length) {
  // Conseiller : modèle de la session (Opus), lecture et diagnostic seulement.
  conseil = await agent(
    `Deux tours de correction n'ont pas suffi pour la tranche ${A.tranche} (${A.spec}). Échecs restants :\n${JSON.stringify(t.echecs, null, 1)}\n\n` +
    `Trouve la cause racine (git diff ${A.base}, le test, le composant), sans rien modifier. Rends : la cause en deux phrases, la correction précise (fichier, ligne, quoi), et si l'échec ne vient pas de la tranche.`,
    { label: `conseil:${A.tranche}`, phase: 'Conseil', effort: 'high' })
  await agent(
    `Applique exactement ce diagnostic pour la tranche ${A.tranche} (${A.spec}) :\n${conseil}`,
    { agentType: 'executant', label: `appliquer-conseil:${A.tranche}`, phase: 'Corriger' })
  t = await tester(tours + 2, specsRouges(t))
}

const relu = await agent(
  `Relis \`git diff ${A.base}\` (tranche ${A.tranche} de ${A.spec}) : ${SECTION}. Consigne qui a été donnée :\n${A.consigne}`,
  { agentType: 'relecteur', schema: VERDICT, label: `relire:${A.tranche}`, phase: 'Relire' })

return { tranche: A.tranche, code, tests: t, tours, conseil, relu }
