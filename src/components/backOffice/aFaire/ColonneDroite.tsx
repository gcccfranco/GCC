"use client";

// La colonne de droite de « À faire » (BO-B), seulement quand la barre latérale est affichée : « Ce dimanche »
// (par service, qui sert) et « Prochaine réunion ». Une lecture qui échoue omet son bloc, jamais la liste.
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { widgetsPermis } from "@/lib/access";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { useProfile } from "@/lib/firebase/users";
import { ficheEvenement } from "@/lib/navigation";
import { todayIso } from "@/lib/scene/dimanches";
import { GRILLES_DU_SERVICE, ceDimanche, prochainDimanche, reunionsDuTableau, servicesDuDimanche } from "@/lib/tableauDeBord/donnees";
import { lireEvenements, lireGrilles, lireSetlists, useLecture } from "@/lib/tableauDeBord/lecture";
import { jourComplet, jourLong } from "./texte";

const CARTE = "rounded-2xl bg-secondary px-4 py-3.5";
/** Les heures du dimanche (comme l'accueil) ; un service sans heure connue n'en montre pas. */
const HEURE_DU_SERVICE = (categorie: string) =>
  categorie === "Culte Francophone" ? "10:30" : /^(Groupe |EDD|Classe)/.test(categorie) ? "13:00" : "";

export function ColonneDroite() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const dimanche = prochainDimanche(nowIsoParis());
  const services = servicesDuDimanche({}, user, profile);
  const permis = widgetsPermis(user, profile);
  const { valeur: etats } = useLecture(async () => {
    const cles = services.flatMap((s) => (GRILLES_DU_SERVICE[s] ?? []).map((g) => g.key));
    const [rows, setlists] = await Promise.all([lireGrilles(cles), lireSetlists(today)]);
    return ceDimanche(rows, setlists, services, dimanche);
  }, `${user?.uid ?? ""}|${dimanche}|${services.join()}`);
  const lireReunion = permis.includes("reunions");
  // BO-G, 9 : `{ reunion }` une fois lue (null tant qu'on lit ou si la lecture échoue) : sans réunion, la carte reste, vide.
  const { valeur: lue } = useLecture(async () => {
    if (!lireReunion) return null;
    return { reunion: reunionsDuTableau(await lireEvenements(today), user, profile, nowIsoParis(), 1)[0]?.reunion ?? null };
  }, `${user?.uid ?? ""}|${today}|${lireReunion}`);
  const reunion = lue?.reunion ?? null;

  const quand = reunion && [
    jourComplet(reunion.date, i18n.language),
    reunion.heure, reunion.lieu,
  ].filter(Boolean).join(", ");

  return (
    <aside data-testid="colonne-droite" className="space-y-3">
      {/* BO-G, 9 : les deux cartes restent quand il n'y a rien, avec « Rien de prévu » (omises seulement si leur lecture échoue). */}
      {etats && (
        <section aria-labelledby="a-faire-dimanche" className={CARTE}>
          <h2 id="a-faire-dimanche" className="text-[15px] font-semibold text-foreground">
            {t("backOffice.aFaire.dimanche.titre", { date: jourLong(dimanche, i18n.language) })}
          </h2>
          {etats.length === 0 && <p className="mt-2 text-[13px] text-muted-foreground">{t("backOffice.aFaire.rienDePrevu")}</p>}
          <div className={etats.length > 0 ? "mt-2 space-y-2.5" : "hidden"}>
            {etats.map((e) => {
              const postes = e.lignes.filter((l) => l.valeur).map((l) => `${t(l.i18n)} ${l.valeur}`);
              const heure = HEURE_DU_SERVICE(e.categorie);
              return (
                <div key={`${e.categorie}-${e.libelle}`} data-testid="service-dimanche">
                  <p className="text-sm font-semibold text-foreground">{e.libelle}{heure && <span className="font-normal text-muted-foreground"> {heure}</span>}</p>
                  {postes.length > 0 && (
                    // Une paire « Poste Nom » ne se coupe pas : la ligne passe entre deux paires.
                    <p className="break-words text-[13px] text-muted-foreground">
                      {postes.map((poste, i) => (
                        <span key={i}>{i > 0 && " "}<span className="whitespace-nowrap">{poste}{i < postes.length - 1 && " ·"}</span></span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/back-office/planning" className="mt-3 inline-block text-[13px] font-semibold text-foreground underline underline-offset-2">
            {t("backOffice.aFaire.dimanche.ouvrir")}
          </Link>
        </section>
      )}
      {lue && (
        <section aria-labelledby="a-faire-reunion" className={CARTE}>
          <h2 id="a-faire-reunion" className="text-[15px] font-semibold text-foreground">{t("backOffice.aFaire.reunion.titre")}</h2>
          {!reunion ? <p className="mt-2 text-[13px] text-muted-foreground">{t("backOffice.aFaire.rienDePrevu")}</p> : <Link href={ficheEvenement(reunion)} className="mt-2 block rounded-md hover:underline">
            <b className="block break-words text-sm font-semibold text-foreground">{reunion.titre}</b>
            <span className="block break-words text-[13px] text-muted-foreground">{quand}</span>
          </Link>}
        </section>
      )}
    </aside>
  );
}
