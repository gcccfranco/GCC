// Lot AO, tranche AO-D (docs/spec-acces-organigramme.md, B4 et B5) : le relevé puis la migration qui remplit
// l'organigramme (equipes/louange, equipes/regie, equipes/edd) depuis les rôles des profils, les sous-colonnes de
// LOUANGE et les colonnes du planning, et recopie le résultat sur les profils. **Lancé par Timothée seul** : aucune
// session n'a accès à la vraie base. Admin SDK (contourne les règles), donc `FIREBASE_SERVICE_ACCOUNT` dans `.env`.
//
//   npx tsx --env-file=.env scripts/acces-vers-organigramme.ts            # à blanc : relevé et plan, rien n'est écrit
//   npx tsx --env-file=.env scripts/acces-vers-organigramme.ts --ecrire   # la migration, étape par étape
//
// Le relevé s'imprime ici, dans le terminal, jamais dans un fichier du dépôt (dépôt public, noms réels).
// Il liste : qui garde son accès, qui en perd un, qui est au planning sans équipe, quels droits cochés n'ont pas
// d'équivalent. On complète l'organigramme, on n'efface rien (ni `serviceRoles`, ni les droits cochés).
// Ordre : relevé à blanc relu, puis --ecrire, puis de nouveau à blanc (« 0 opération »).
// La logique est dans src/lib/acces/migration.ts, testée sur une base simulée (tests/acces-migration.spec.ts).

import { getApp } from "firebase-admin/app"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "../src/lib/push/admin"
import { loadPlanningData } from "../src/lib/planning/names"
import { appliquer, enLectureSeule, ETAPES, formaterReleve, planifier, type Donnees, type Magasin } from "../src/lib/acces/migration"

const ecrire = process.argv.includes("--ecrire")

/** La vraie base vue comme des documents à chemin. */
function magasinAdmin(): Magasin {
  const db = adminDb()
  return {
    lire: async (chemin) => {
      const snap = await db.doc(chemin).get()
      return snap.exists ? (snap.data() as Donnees) : null
    },
    lister: async (collection) => (await db.collection(collection).get()).docs.map((d) => ({ id: d.id, data: d.data() as Donnees })),
    listerIds: async (collection) => (await db.collection(collection).listDocuments()).map((d) => d.id),
    ecrire: async (chemin, data) => {
      await db.doc(chemin).set(data)
    },
    maj: async (chemin, data, supprimer = []) => {
      await db.doc(chemin).update({ ...data, ...Object.fromEntries(supprimer.map((champ) => [champ, FieldValue.delete()])) })
    },
    supprimer: async (chemin) => {
      await db.doc(chemin).delete()
    },
  }
}

async function main() {
  // Sans --ecrire, toute écriture lève : le relevé est en lecture seule.
  const magasin = ecrire ? magasinAdmin() : enLectureSeule(magasinAdmin())
  console.log(`Base : projet ${getApp().options.projectId} — ${ecrire ? "ÉCRITURE (--ecrire)" : "à blanc, rien n'est écrit"}`)
  const planning = await loadPlanningData()
  const { releve, plan } = await planifier(magasin, planning)
  console.log(formaterReleve(releve).join("\n"))
  if (ecrire) {
    console.log("\nMigration :")
    await appliquer(magasin, plan, (etape, n) => console.log(`  Étape ${etape} — ${ETAPES[etape]} : ${n} opération(s)…`))
    const apres = await planifier(magasin, planning)
    console.log(`\nTerminé. Nouveau passage à blanc : ${apres.plan.length} opération(s)${apres.plan.length ? " — relancer le script" : ""}.`)
  } else {
    console.log("\nÀ blanc : rien n'a été écrit. Après avoir lu les quatre listes, relancer avec --ecrire.")
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
