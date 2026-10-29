export const meta = {
  name: 'audit-code',
  description: "Audit du code en 11 dimensions (chercheurs Opus/Sonnet/Haiku selon la difficulté), puis contre-vérification adversariale Sonnet de chaque constat",
  whenToUse: "Audit complet du code (sécurité, permissions, logique, i18n, accessibilité, perf, hors-ligne, cohérence, docs, suivi des audits). Coûte environ 60 agents et 5 M de jetons : sur demande de Timothée seulement. args : { commit, build? (chemin de la sortie de next build) }",
  phases: [
    { title: 'Chercher', detail: 'un chercheur par dimension, lecture seule' },
    { title: 'Contre-vérifier', detail: 'chaque constat P1/P2 réfuté ou confirmé, P3 par lot', model: 'sonnet' },
  ],
}

const COMMIT = args && args.commit
if (!COMMIT) throw new Error('args attendus : { commit, build? }')
const CONTEXTE = `Dépôt /home/user/GCC (Next.js 16, App Router, TypeScript, Firebase Auth + Firestore en REST, Vercel), branche ui/apple-design, commit audité ${COMMIT}. Environ 83 000 lignes dans src/.
RÈGLES STRICTES :
- Lecture seule : ne modifie AUCUN fichier, aucun état git (pas de checkout, stash, commit, pull). Pas de serveur, pas de Playwright, pas de npm install (d'autres tests peuvent tourner sur les ports 3100, 3101, 3300).
- Cherche par commande : \`graphify query "<question>"\`, \`git grep -n\`, \`sed -n 'a,bp'\`. Garde le contexte court : n'ouvre que les passages utiles.
- Chaque constat est PROUVÉ : chemin:ligne lu dans le fichier lui-même, citation courte. Rien de déduit d'un nom de fichier. Pas de spéculation : si tu n'as pas pu établir un point, ne le rends pas.
- Choix assumés, à NE PAS signaler : les règles Firestore autorisent read: if signedIn() sur toutes les setlists et tous les profils (filtrage isPrivate côté client seulement) ; Firestore en REST (pas de SDK WebChannel) ; WebKit écarté des tests ; firestore.rules publié à la main.
- Zones gelées (docs/audit-ui-apple-design.md § 2 « Restent gelés ») : couleurs de serviceColors.ts, logo, couleurs des accords/简谱/sections (--chord-color, --jianpu-color, --sec-*), l'intérieur du calque 简谱 (JianpuSheet, calques certifiés), l'export PDF. Un défaut DANS ces zones se rend avec gele: true.
- L'interrupteur BACK_OFFICE (src/lib/backOffice.ts, NEXT_PUBLIC_BACK_OFFICE === "1") est absent en ligne : précise si un constat concerne le site en ligne, le back-office local, ou les deux.
- Sévérité : P1 = faille, perte de données, geste ou page cassés, le dimanche peut casser ; P2 = incohérence visible, risque réel, sensation dégradée ; P3 = finition, dette.
- delegable : qui peut corriger — "haiku" (mécanique, texte, une ligne), "sonnet" (modification décidée sur plusieurs fichiers), "opus" (demande débogage, conception ou jugement), "timothee" (décision produit avant tout code).
- 4 à 12 constats au plus, classés du plus grave au moins grave. Mieux vaut 5 constats sûrs que 12 douteux. Rédige en français.`

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          severite: { type: 'string', enum: ['P1', 'P2', 'P3'] },
          portee: { type: 'string', enum: ['en-ligne', 'back-office', 'les-deux', 'depot'] },
          preuves: { type: 'array', items: { type: 'string' }, description: 'chemin:ligne — ce qu on y lit' },
          impact: { type: 'string', description: 'scénario concret : qui, quoi, quand' },
          piste: { type: 'string' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
          delegable: { type: 'string', enum: ['haiku', 'sonnet', 'opus', 'timothee'] },
          gele: { type: 'boolean' },
        },
        required: ['titre', 'severite', 'portee', 'preuves', 'impact', 'piste', 'effort', 'delegable', 'gele'],
      },
    },
    non_etabli: { type: 'array', items: { type: 'string' }, description: 'pistes vues mais non prouvées' },
  },
  required: ['findings', 'non_etabli'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirme', 'refute', 'incertain', 'deja_corrige'] },
    severite_corrigee: { type: 'string', enum: ['P1', 'P2', 'P3'] },
    raison: { type: 'string' },
    preuve: { type: 'string', description: 'chemin:ligne qui tranche' },
  },
  required: ['verdict', 'severite_corrigee', 'raison', 'preuve'],
}

const VERDICTS_LOT = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          verdict: { type: 'string', enum: ['confirme', 'refute', 'incertain', 'deja_corrige'] },
          severite_corrigee: { type: 'string', enum: ['P1', 'P2', 'P3'] },
          raison: { type: 'string' },
        },
        required: ['index', 'verdict', 'severite_corrigee', 'raison'],
      },
    },
  },
  required: ['verdicts'],
}

const DIMENSIONS = [
  { cle: 'securite-api', model: undefined, effort: 'high', prompt: `DIMENSION : sécurité et robustesse des 20 routes API (src/app/api/**/route.ts). Pour chacune : le jeton Firebase est-il vérifié côté serveur (firebase-admin verifyIdToken) avant toute action ? L'autorisation correspond-elle aux droits de src/lib/access.ts ? Les entrées sont-elles validées (type, taille, champs attendus) ? Injection possible dans le HTML des emails Resend (/api/report) ou dans les notifications push ? Un appel peut-il être répété en boucle pour spammer des emails ou des notifications à toute l'église (/api/push/broadcast, notify-*) ? Le cron /api/cron/reminders est-il protégé par un secret (CRON_SECRET) ? Les erreurs renvoient-elles des traces internes ? Les routes de back-office renvoient-elles bien 404 quand BACK_OFFICE est coupé (en ligne) ? /api/song/[slug] résiste-t-il à un slug du type ../../ ?` },
  { cle: 'permissions', model: undefined, effort: 'high', prompt: `DIMENSION : cohérence des permissions entre src/lib/access.ts (client), firestore.rules (serveur), et les contrôles des routes API. ADMIN_EMAILS est-il identique des deux côtés ? Un membre connecté peut-il ÉCRIRE ce qu'il ne devrait pas (modifier ses propres rôles, droits, dansEquipes/referentDe/sousEquipes que « seul le serveur écrit », le profil d'un autre, la setlist d'un autre, supprimer des évènements, s'inscrire à la place d'un autre) ? Les champs « écrits par le serveur seul » (voir tests/helpers/fakeSession.ts, commentaires FakeProfile) sont-ils vraiment protégés en écriture dans firestore.rules ? Une règle client sans miroir serveur (ou l'inverse) ? Le lot AO (accès calculés depuis l'organigramme, docs/spec-acces-organigramme.md) a-t-il son équivalent dans les rules ? Rappel : la LECTURE large est un choix assumé, ne pas la signaler.` },
  { cle: 'logique-chants', model: 'sonnet', effort: 'high', prompt: `DIMENSION : bugs de logique dans le cœur « chants » : parseur ChordPro (src/lib/chordpro), transposition (src/lib/transpose.ts, transposeAST.ts : bémols/dièses, mineurs, Cb/E#, accords slash, notation chiffrée), tonalité recommandée, pinyin (src/lib/pinyin.ts), lecture des paramètres d'URL en JSON de la page chant (JSON.parse protégé ? valeur inattendue ?), index des chants (scripts/build-index.ts), recherche (fuse.js). Cherche les cas limites qui donnent un résultat FAUX à l'écran ou un plantage : chaîne vide, accord inconnu, tonalité absente, capo, transposition de ±12, slug avec caractères chinois, etc. Lis les tests existants (tests/*transpose*, tests/key-selector*) pour ne pas signaler un cas déjà couvert.` },
  { cle: 'logique-planning', model: 'sonnet', effort: 'high', prompt: `DIMENSION : bugs de logique dans planning, dates, évènements, rappels : src/lib/planning (lecture CSV du Google Sheet sheets.ts, data.ts, utils), src/lib/evenements, src/lib/calendrier, src/lib/reunions, src/lib/taches, src/app/api/cron/reminders. Cherche : fuseau horaire (new Date("2026-10-25") interprété en UTC puis affiché à Paris, changement d'heure des derniers dimanches de mars et d'octobre), passage d'année 2026→2027, dimanche calculé de travers, CSV avec virgules/guillemets/retours à la ligne dans une cellule, colonne absente, Sheet indisponible (réseau) → page blanche ?, rappel envoyé deux fois ou jamais, comparaison de noms (normalizeName) qui confond deux personnes.` },
  { cle: 'i18n', model: 'sonnet', effort: 'medium', prompt: `DIMENSION : bilinguisme FR / 中文. (1) Parité des clés entre src/locales/fr.json et src/locales/zh-CN.json (fr.json a 3766 lignes, zh-CN.json 3720) : écris un petit script node en lecture seule (node -e, aplatis les clés) pour lister les clés manquantes de chaque côté et les interpolations {{x}} qui diffèrent. (2) Clés utilisées dans le code (t("…")) absentes des fichiers. (3) Texte français ou chinois écrit en dur dans les .tsx de src/ hors t() et visible par l'utilisateur (titres, boutons, aria-label, placeholders, toasts, messages d'erreur) — donne un comptage par dossier et les 10 cas les plus visibles. (4) Formats de date/heure/nombre qui ignorent la langue choisie. (5) Attribut lang de <html> qui ne suit pas la langue. Ne liste PAS le contenu des chants (.cho).` },
  { cle: 'accessibilite', model: 'sonnet', effort: 'medium', prompt: `DIMENSION : accessibilité dans le code (src/components, src/app) : boutons-icônes sans nom accessible (aria-label), div/span cliquables sans rôle ni clavier, dialogues et feuilles (vaul, Radix) sans titre, focus perdu après fermeture, cibles tactiles sous 44 px (h-8, w-8, size-7…) sur des actions fréquentes, contrastes des jetons de couleur dans src/app/globals.css en clair ET en sombre (calcule le ratio WCAG des paires texte/fond principales : texte secondaire, texte sur orange --primary, placeholder), prefers-reduced-motion non respecté par des animations, champs de formulaire sans label, images sans alt, user-scalable=no / maximum-scale dans le viewport.` },
  { cle: 'performance', model: 'sonnet', effort: 'medium', prompt: `DIMENSION : performance et poids. Regarde : la sortie du build de production si elle est fournie (${args.build || 'non fournie : passe'}) ; le poids de public/ (du -sh public/*, polices, scans 简谱 public/jianpu, songs-index.json) et ce qui est chargé à chaque page ; les grosses dépendances importées côté client (firebase, @react-pdf/renderer, fuse.js, write-excel-file, qrcode) sans import dynamique ; les pages entières en "use client" ; les re-rendus coûteux évidents (contexte global qui change à chaque frappe, listes de 382 chants sans mémo) ; les requêtes Firestore REST en cascade (N+1) au chargement d'une page ; les fetch du Google Sheet répétés sans cache.` },
  { cle: 'pwa-hors-ligne', model: 'sonnet', effort: 'high', prompt: `DIMENSION : service worker et hors-ligne (public/sw.js, son enregistrement dans src/, tests/service-worker.spec.ts). Le dimanche, le réseau de l'église est instable : la page d'un chant et la setlist déjà ouvertes doivent marcher hors ligne. Vérifie : stratégie network-first du HTML avec repli sur le cache si le réseau tombe (et un délai si le réseau traîne ?), cache-first de /_next/static, stale-while-revalidate des polices/songs-index/api/song/jianpu, purge des anciens caches à l'activation, croissance illimitée du cache (scans 简谱 de 1-2 Mo chacun ?), mise à jour du SW (skipWaiting/clients.claim : un vieil onglet peut-il mélanger ancien HTML et nouveaux chunks → page cassée après déploiement ?), réponses opaques ou erreurs 500 mises en cache, notifications push (clic → bonne URL), exclusion des serveurs locaux, données Firestore (setlist) disponibles hors ligne ou non.` },
  { cle: 'coherence-ui-code', model: 'sonnet', effort: 'medium', prompt: `DIMENSION : cohérence du système visuel dans le code et dette. Recense : couleurs écrites en dur (#hex, rgb()) dans les composants au lieu des jetons de globals.css/tailwind.config.ts ; recettes de verre / backdrop-blur / ombres / rayons / z-index différentes pour le même rôle ; plusieurs composants qui font la même chose (deux boutons, deux feuilles, deux sélecteurs de tonalité) ; durées et courbes d'animation non unifiées ; composants ou fichiers morts (non importés nulle part — vérifie avec git grep) ; TODO/FIXME/HACK restants ; console.log oubliés en production. Donne des comptages, et les cas qui produisent une différence VISIBLE pour l'utilisateur en premier.` },
  { cle: 'derive-docs', model: 'haiku', effort: 'medium', prompt: `DIMENSION : dérive entre la documentation et le code. Compare CLAUDE.md (racine), README.md, docs/ARCHITECTURE.md à la réalité : nombre et liste des routes API (find src/app/api -name route.ts), scripts de package.json et fichiers qu'ils appellent, chemins de fichiers cités qui n'existent plus, stratégies du service worker décrites vs public/sw.js, couleurs citées vs globals.css. Dans docs/feuille-de-route.md, relève les lots marqués « à valider », « codé », « poussé » depuis plus de 7 jours (la date du jour est dans ton contexte) sans validation notée. Règle du CLAUDE.md « aucun nom réel de membre dans les tests, fixtures, specs ou commits » : relève les prénoms + initiales ou adresses email qui ressemblent à de vraies personnes dans tests/ (ne recopie pas l'adresse en entier dans ton rapport, masque-la).` },
  { cle: 'suivi-audits', model: 'sonnet', effort: 'medium', prompt: `DIMENSION : suivi des audits précédents. AUDIT.md (13/07/2026) liste des problèmes transversaux T1…; docs/audit-ui-apple-design.md (13/09/2026) liste 7 priorités P1/P2 et des constats A1…, B1…, C, D. Pour CHAQUE problème de ces deux audits, établis l'état au commit ${COMMIT} : corrigé / partiel / toujours là / devenu sans objet, preuve à l'appui (chemin:ligne). Rends uniquement comme findings ceux qui sont « toujours là » ou « partiel » (titre préfixé par leur identifiant d'origine, ex. « AUDIT T3 — … » ou « UI A4 — … »), et mets dans non_etabli un résumé d'une ligne par problème corrigé (ex. « T1 corrigé : sw.js:42 »).` },
]

const fmt = (f, i) => `#${i} [${f.severite}] ${f.titre}\nPortée : ${f.portee}\nPreuves : ${f.preuves.join(' | ')}\nImpact : ${f.impact}\nPiste : ${f.piste}`

const verifierUn = (f, dim) => agent(`${CONTEXTE}

Un chercheur a rendu ce constat (dimension ${dim}). Ton rôle : le RÉFUTER si possible. Sois sceptique : relis toi-même chaque preuve citée dans le fichier, cherche le code qui protège déjà contre ce cas (garde ailleurs, test existant, règle Firestore, middleware), vérifie que le scénario d'impact est réellement atteignable par un utilisateur, et que la sévérité est juste. Vérifie aussi si le constat a été corrigé depuis : \`git fetch -q origin ui/apple-design\` (si erreur de verrou, réessaie une fois) puis \`git diff ${COMMIT} origin/ui/apple-design -- <fichiers cités>\` ; s'il est corrigé sur origin, verdict deja_corrige.
Dans le doute sur la réalité du défaut, verdict incertain (pas confirme).

CONSTAT :
${fmt(f, 0)}`, { label: `verif:${dim}:${f.titre.slice(0, 40)}`, phase: 'Contre-vérifier', schema: VERDICT, model: 'sonnet', effort: 'medium' })
  .then(v => ({ ...f, dimension: dim, verif: v }))

const verifierLot = (fs, dim) => agent(`${CONTEXTE}

Un chercheur a rendu ces constats de finition (dimension ${dim}). Pour CHACUN, essaie de le réfuter : relis la preuve, vérifie qu'il est réel et visible, et s'il a été corrigé depuis (\`git fetch -q origin ui/apple-design\` puis \`git diff ${COMMIT} origin/ui/apple-design -- <fichier>\`). Rends un verdict par index.

${fs.map(fmt).join('\n\n')}`, { label: `verif-lot:${dim}`, phase: 'Contre-vérifier', schema: VERDICTS_LOT, model: 'sonnet', effort: 'low' })
  .then(r => fs.map((f, i) => {
    const v = (r && r.verdicts || []).find(x => x.index === i)
    return { ...f, dimension: dim, verif: v ? { ...v, preuve: '' } : { verdict: 'incertain', severite_corrigee: f.severite, raison: 'pas de verdict rendu', preuve: '' } }
  }))

const resultats = await pipeline(
  DIMENSIONS,
  d => agent(`${CONTEXTE}\n\n${d.prompt}`, { label: `chercher:${d.cle}`, phase: 'Chercher', schema: FINDINGS, model: d.model, effort: d.effort })
    .then(r => ({ cle: d.cle, ...(r || { findings: [], non_etabli: ['agent mort'] }) })),
  async r => {
    const graves = r.findings.filter(f => f.severite !== 'P3')
    const legers = r.findings.filter(f => f.severite === 'P3')
    log(`${r.cle} : ${r.findings.length} constats (${graves.length} P1/P2) → contre-vérification`)
    const jobs = graves.map(f => () => verifierUn(f, r.cle))
    if (legers.length) jobs.push(() => verifierLot(legers, r.cle))
    const v = (await parallel(jobs)).filter(Boolean).flat()
    return { cle: r.cle, non_etabli: r.non_etabli, constats: v }
  },
)

const tous = resultats.filter(Boolean)
const garde = tous.flatMap(r => r.constats.filter(c => c.verif && (c.verif.verdict === 'confirme' || c.verif.verdict === 'incertain')))
log(`Constats gardés : ${garde.length} (confirmés ou incertains) ; écartés : ${tous.flatMap(r => r.constats).length - garde.length}`)
return { commit: COMMIT, dimensions: tous }
