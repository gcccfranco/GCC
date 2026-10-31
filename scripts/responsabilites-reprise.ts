// Lot RS, tranche RS-B (docs/spec-responsabilites.md, « Reprise ») : donne à chaque compte les responsabilités
// (`users/{uid}.responsabilites`) que ses droits d'aujourd'hui lui valaient (référent Louange, référent EDD, Comité
// Orga, rôles de groupe, plannings cochés), et liste ce qu'il perd. **Lancé par Timothée seul** : aucune session n'a
// accès à la vraie base. Admin SDK (contourne les règles), donc `FIREBASE_SERVICE_ACCOUNT` dans `.env`.
//
// Mode d'emploi :
//   1. À blanc (par défaut), rien n'est écrit :
//        npx tsx --env-file=.env scripts/responsabilites-reprise.ts
//   2. Relire la liste « garde / gagne / perd », personne par personne.
//   3. Écrire :
//        npx tsx --env-file=.env scripts/responsabilites-reprise.ts --ecrire
//   4. De nouveau à blanc : il doit dire « 0 opération ».
//
// Le relevé s'imprime ici, dans le terminal, jamais dans un fichier du dépôt (dépôt public, noms réels).
// Seul le champ `responsabilites` est écrit (union de l'existant et du gagné) ; rien n'est effacé. L'admin corrige
// ensuite sur la page Équipes › Responsabilités.
// La logique est dans src/lib/acces/repriseResponsabilites.ts, testée sur une base simulée
// (tests/responsabilites-reprise.spec.ts).

import { getApp } from "firebase-admin/app"
import { adminDb } from "../src/lib/push/admin"
import { appliquer, enLectureSeule, formaterReleve, planifier, type Donnees, type Magasin } from "../src/lib/acces/repriseResponsabilites"

const ecrire = process.argv.includes("--ecrire")

/** La vraie base vue comme des documents à chemin (seuls lister et maj servent ici). */
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
    maj: async (chemin, data) => {
      await db.doc(chemin).update(data)
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
  const { lignes, plan } = await planifier(magasin)
  console.log(formaterReleve(lignes, plan).join("\n"))
  if (ecrire) {
    await appliquer(magasin, plan)
    const apres = await planifier(magasin)
    console.log(`\nTerminé. Nouveau passage à blanc : ${apres.plan.length} opération(s)${apres.plan.length ? " — relancer le script" : ""}.`)
  } else {
    console.log("\nÀ blanc : rien n'a été écrit. Après avoir relu la liste, relancer avec --ecrire.")
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
