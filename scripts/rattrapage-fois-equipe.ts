// Lot LF, LF5 (docs/spec-lectures-firestore.md) : pose le champ `equipe` sur les « fois » existantes
// (equipes/{e}/taches/{t}/fois/{date}), pour que la requête unique par équipe (`listTaches`) les voie.
// Les nouvelles fois le portent déjà (`ecrireFois`, src/lib/firebase/taches.ts). **Lancé une seule fois, par
// Timothée, en local** : aucune session n'a accès à la vraie base. Admin SDK (contourne les règles), donc
// `FIREBASE_SERVICE_ACCOUNT` dans `.env.local`.
//
//   npx tsx --env-file=.env.local scripts/rattrapage-fois-equipe.ts --essai   # compte, n'écrit rien
//   npx tsx --env-file=.env.local scripts/rattrapage-fois-equipe.ts           # pose le champ
//
// Ordre de mise en ligne : 1. fusion dans main (sans la règle, `listTaches` retombe sur la lecture tâche par
// tâche, et toute nouvelle fois porte déjà `equipe`) ; 2. lancer ce script ; 3. publier en dernier la règle
// `{chemin=**}/fois/{date}` de firestore.rules (console Firebase). Règle publiée avant ce script : les fois
// anciennes seraient invisibles à la requête unique. Relançable sans effet : ne touche que les documents où `equipe` manque
// ou diffère du chemin.

import { adminDb } from "../src/lib/push/admin"

const essai = process.argv.includes("--essai")
const PAR_LOT = 400

async function main() {
  const db = adminDb()
  console.log(`${essai ? "Essai (rien n'est écrit)" : "ÉCRITURE"} : lecture de collectionGroup("fois")…`)
  const snap = await db.collectionGroup("fois").get()
  let vus = 0
  const aPoser: Array<{ ref: FirebaseFirestore.DocumentReference; equipe: string }> = []
  for (const d of snap.docs) {
    // equipes/{e}/taches/{t}/fois/{date} : les autres chemins (anciens pôles, etc.) sont laissés.
    const m = d.ref.path.match(/^equipes\/([^/]+)\/taches\/[^/]+\/fois\/[^/]+$/)
    if (!m) continue
    vus++
    if (d.get("equipe") !== m[1]) aPoser.push({ ref: d.ref, equipe: m[1] })
  }
  if (!essai) {
    for (let i = 0; i < aPoser.length; i += PAR_LOT) {
      const lot = db.batch()
      for (const { ref, equipe } of aPoser.slice(i, i + PAR_LOT)) lot.update(ref, { equipe })
      await lot.commit()
    }
  }
  console.log(`Documents « fois » vus : ${vus} ; ${essai ? "à toucher" : "touchés"} : ${aPoser.length}.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
