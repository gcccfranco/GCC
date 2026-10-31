// Lot F (docs/spec-retouches-v18.md, D26) : le pianiste de Fidélité est celui du planning du
// groupe ; le piano du planning des musiciens n'est plus affiché. Avant la mise en ligne, ce relevé
// liste les dimanches où les deux plannings ne disent pas la même chose, pour que Timothée les voie.
// **Lecture seule** : rien n'est écrit, ni dans le Google Sheet ni dans Firestore.
//
//   npx tsx scripts/releve-pianistes-fidelite.ts              # le Google Sheet public, lu en CSV
//   npx tsx scripts/releve-pianistes-fidelite.ts --firestore  # + les grilles de l'app (Timothée le lance)
//
// Avec --firestore, chaque dimanche écrit dans l'app remplace celui du Sheet, comme sur le site
// (`fusionnerLignes`) : les grilles `plannings/fidelite` et `plannings/fideliteMusiciens`.

import { fetchGrille } from "../src/lib/planning/grille"
import { fusionnerLignes, pianistesQuiDifferent } from "../src/lib/planning/grilles"
import { lireFideliteMusiciensSheet, lireFideliteSheet } from "../src/lib/planning/sheets"

async function main() {
  const avecApp = process.argv.includes("--firestore")
  const [groupeSheet, musiciensSheet] = await Promise.all([lireFideliteSheet(), lireFideliteMusiciensSheet()])
  if (!groupeSheet.length && !musiciensSheet.length) throw new Error("Google Sheet illisible : aucune ligne de Fidélité lue.")
  const [groupe, musiciens] = avecApp
    ? await Promise.all([
      fetchGrille("fidelite").then((app) => fusionnerLignes(app, groupeSheet)),
      fetchGrille("fideliteMusiciens").then((app) => fusionnerLignes(app, musiciensSheet)),
    ])
    : [groupeSheet, musiciensSheet]

  const ecarts = pianistesQuiDifferent(groupe, musiciens)
  const source = avecApp ? "Google Sheet + grilles de l'app" : "Google Sheet seul"
  console.log(`Pianistes de Fidélité qui diffèrent (${source}) : ${ecarts.length} dimanche(s).`)
  console.log("Après le lot F, c'est la colonne « Groupe » qui est affichée.\n")
  if (!ecarts.length) return
  const fmt = (iso: string) => iso.split("-").reverse().join("/")
  const l = Math.max(6, ...ecarts.map((e) => (e.groupe || "(vide)").length))
  console.log(`Date        ${"Groupe".padEnd(l)}  Musiciens (plus affiché)`)
  for (const e of ecarts) console.log(`${fmt(e.date)}  ${(e.groupe || "(vide)").padEnd(l)}  ${e.musiciens}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
