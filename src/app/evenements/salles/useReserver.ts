// La logique d'une réservation, partagée par Salles et la page d'une fête (lot AS, T3 ; AS1) : les props `feteDu` et
// `nomFete` de la feuille (`FeuilleReserver`) et `enregistrer` (SA8, SA9, règles de la fête AR21).
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { createReservation, updateReservation, type Reservation } from "@/lib/firebase/reservations"
import { canReserverPour, isCoordination } from "@/lib/access"
import { autreQuiCroise, chevauchement } from "@/lib/salles/conflit"
import { signalerConflit } from "@/lib/salles/signalerConflit"
import { occupationsDu, saisonFeteDu, type SourcesSalles } from "@/lib/salles/occupations"
import { feteDe, libelleEdition, nomFete as nomCourt } from "@/lib/scene/fetes"
import { todayIso } from "@/lib/scene/dimanches"
import { commence, dansUnePlage, famillesDe, heureLocale, quiPermis, saisonDe } from "@/lib/scene/saison"
import { libelleQui } from "@/lib/fetes/qui"
import type { FeteDeLaFeuille, Saisie } from "./FeuilleReserver"

export function useReserver({ sources, relire, apres }: {
  sources: SourcesSalles | null
  /** Les réservations du jour (au moins) relues ; Salles y range aussi son état. */
  relire: (date: string) => Promise<Reservation[]>
  /** Après l'écriture et le signalement d'un conflit (la page de la fête recharge ses créneaux). */
  apres?: () => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const langue = i18n.language?.startsWith("zh") ? "zh" : "fr"
  const { user } = useAuth()
  const { profile } = useProfile()

  const feteDu = (d: string): FeteDeLaFeuille | null => {
    const s = sources && saisonFeteDu(d, sources.scene)
    if (!s) return null
    const p = s.programme
    const coordination = isCoordination(user, profile)
    const familles = famillesDe(p.quiAutorises ?? []).map((f) => t(`planning.saison.familles.${f}`))
    return {
      id: p.id, nom: libelleEdition(s.fete, s.annee, langue), court: nomCourt(s.fete, langue), ouverte: s.ouverte,
      permis: canReserverPour(user, profile, p, []), quiOptions: quiPermis(coordination ? {} : p),
      quiAutre: canReserverPour(user, profile, p, ["Autre…"]),
      familles: new Intl.ListFormat(langue === "zh" ? "zh-CN" : "fr", { style: "long", type: "conjunction" }).format(familles),
      saison: saisonDe({ ...p, debut: p.debut! }),
    }
  }

  const nomFete = (id: string): string | null => {
    const p = sources?.scene.find(({ programme }) => programme.id === id)?.programme
    const f = p && feteDe(p)
    return p && f ? libelleEdition(f, p.annee ?? Number(p.jourJ.slice(0, 4)), langue) : null
  }

  // SA8 : avant d'écrire, les réservations se relisent ; une occupation qui croise désormais le moment (hors la
  // réservation qu'on modifie) refuse l'envoi. SA9 : après l'écriture, une réservation enregistrée au même moment
  // qui croise la sienne est signalée au serveur. Rend « ok », « refus » (feuille relue) ou un message à afficher.
  const enregistrer = async (saisie: Saisie, id?: string): Promise<"ok" | "refus" | string> => {
    if (!user || !sources) return "refus"
    const avant = await relire(saisie.date)
    if (chevauchement(occupationsDu(saisie.date, { ...sources, reservations: avant }), saisie.salle, saisie, id)) return "refus"
    let ecrite = id
    // AS3, AS4 : une réservation de fête suit les règles de la fête ; hors des plages de la saison, c'est « un autre moment ».
    let champs: Saisie = saisie
    if (saisie.fete) {
      const ancienne = id ? sources.reservations?.find((r) => r.id === id) : undefined
      // Q11 : un moment commencé ne se réserve plus ; garder son moment en modifiant reste permis.
      if (commence(saisie.date, saisie.debut, todayIso(), heureLocale()) && !(ancienne && ancienne.date === saisie.date && ancienne.debut === saisie.debut)) return t("planning.saison.dejaCommence")
      const p = sources.scene.find(({ programme }) => programme.id === saisie.fete)?.programme
      if (!p?.debut || !canReserverPour(user, profile, p, saisie.qui ?? [])) {
        const refuses = p?.debut ? (saisie.qui ?? []).filter((q) => !quiPermis(p).includes(q)) : []
        if (refuses.length) return t("planning.saison.quiRefuse", { qui: refuses.map((q) => libelleQui(q, langue)).join(", ") })
        throw new Error("fete")
      }
      const dans = dansUnePlage(saisonDe({ ...p, debut: p.debut }), { dimanche: saisie.date, debut: saisie.debut, fin: saisie.fin })
      // Revenue dans une plage : `libre` s'en va (masque sans valeur) ; sinon il reste ou se pose.
      if (!dans) champs = { ...saisie, libre: true }
      else if (ancienne?.libre) champs = { ...saisie, libre: undefined }
    }
    if (id) await updateReservation(id, champs)
    else ecrite = await createReservation({ ...champs, auteurUid: user.uid, auteurNom: (saisie.fete ? profile && `${profile.firstName} ${profile.lastName}`.trim() : profile?.firstName?.trim()) || user.email || "" })
    // Écrite : une relecture ou un rechargement manqués ne doivent pas faire croire à un échec (un réessai doublerait).
    try {
      const lues = await relire(saisie.date)
      const moi = lues.find((r) => r.id === ecrite)
      const autre = moi && autreQuiCroise(moi, lues)
      if (autre) void signalerConflit([moi.id, autre.id])
      await apres?.()
    } catch {}
    return "ok"
  }

  return { feteDu, nomFete, enregistrer }
}
