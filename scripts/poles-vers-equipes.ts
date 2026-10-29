// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md, tranche EQ-E) : le relevé
// puis la migration des pôles vers les équipes. **Lancé par Timothée seul** : aucune session n'a accès
// à la vraie base. Admin SDK (contourne les règles), donc `FIREBASE_SERVICE_ACCOUNT` dans `.env.local`.
//
//   npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts            # à blanc : relevé et plan, rien n'est écrit
//   npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts --ecrire   # la migration, étape par étape
//
// Le relevé s'imprime ici, dans le terminal, jamais dans un fichier du dépôt (dépôt public, noms réels).
// Ordre de la bascule : relevé, publier firestore.rules, --ecrire, puis de nouveau à blanc (« 0 opération »).
// La logique est dans src/lib/equipes/migration.ts, testée sur une base simulée (tests/equipes-migration.spec.ts).

import { getApp } from "firebase-admin/app"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "../src/lib/push/admin"
import { appliquer, enLectureSeule, ETAPES, formaterReleve, planifier, type Donnees, type Magasin } from "../src/lib/equipes/migration"

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
  const { releve, plan } = await planifier(magasin)
  console.log(formaterReleve(releve).join("\n"))
  if (ecrire) {
    console.log("\nMigration :")
    await appliquer(magasin, plan, (etape, n) => console.log(`  Étape ${etape} — ${ETAPES[etape]} : ${n} opération(s)…`))
    const apres = await planifier(magasin)
    console.log(`\nTerminé. Nouveau passage à blanc : ${apres.plan.length} opération(s)${apres.plan.length ? " — relancer le script" : ""}.`)
    if (apres.releve.conflits.length) console.log(`${apres.releve.conflits.length} conflit(s) à régler à la main (voir plus haut).`)
  } else {
    console.log("\nÀ blanc : rien n'a été écrit. Après avoir lu les listes et publié firestore.rules, relancer avec --ecrire.")
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
