"use client";

// La colonne de droite de « À faire » (BO-B), seulement quand la barre latérale est affichée : « Ce dimanche »
// (par service, qui sert) et « Prochaine réunion ». Une lecture qui échoue omet son bloc, jamais la liste.
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { widgetsPermis } from "@/lib/access";
import { styleTexteService } from "@/lib/couleurSombre";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { useProfile } from "@/lib/firebase/users";
import { ficheEvenement } from "@/lib/navigation";
import { todayIso } from "@/lib/scene/dimanches";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { categoryColor } from "@/lib/serviceColors";
import { GRILLES_DU_SERVICE, ceDimanche, prochainDimanche, reunionsDuTableau, servicesDuDimanche } from "@/lib/tableauDeBord/donnees";
import { lireEvenements, lireGrilles, lireSetlists, useLecture } from "@/lib/tableauDeBord/lecture";
import { jourComplet, jourLong } from "./texte";

const CARTE = "carte-groupe px-4 py-3.5";
/** Les heures du dimanche (comme l'accueil ; EDD 15:30–17:00) ; un service sans heure connue n'en montre pas. */
const HEURE_DU_SERVICE = (categorie: string) =>
  categorie === "Culte Francophone" ? "10:30" : categorie.startsWith("Groupe ") ? "13:00"
    : (EDD_CLASSES as readonly string[]).includes(categorie) ? "15:30–17:00" : "";

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
          <h2 id="a-faire-dimanche" className="text-base font-semibold text-foreground">
            {t("backOffice.aFaire.dimanche.titre", { date: jourLong(dimanche, i18n.language) })}
          </h2>
          {etats.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t("backOffice.aFaire.rienDePrevu")}</p>}
          <div className={etats.length > 0 ? "mt-2 space-y-2.5" : "hidden"}>
            {etats.map((e) => {
              const heure = HEURE_DU_SERVICE(e.categorie);
              return (
                <div key={`${e.categorie}-${e.libelle}`} data-testid="service-dimanche">
                  <p className="text-sm font-semibold text-foreground">{e.libelle}{heure && <span className="font-normal text-muted-foreground"> {heure}</span>}</p>
                  {e.lignes.length > 0 && (
                    <dl className="mt-0.5">
                      {e.lignes.map((l) => (
                        <div key={l.cle} className="flex min-w-0 gap-2.5 border-t border-border/70 py-1.5 text-sm">
                          <dt className="w-[88px] shrink-0 text-sm text-muted-foreground">{t(l.i18n)}</dt>
                          <dd className="min-w-0 break-words text-foreground">
                            {l.valeur || (
                              <Link href="/back-office/planning" className="texte-service font-semibold underline-offset-2 hover:underline" style={styleTexteService(categoryColor(e.categorie))}>
                                {t("backOffice.aFaire.dimanche.aChoisir")}
                              </Link>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/back-office/planning" className="mt-3 inline-block text-sm font-semibold text-foreground underline underline-offset-2">
            {t("backOffice.aFaire.dimanche.ouvrir")}
          </Link>
        </section>
      )}
      {lue && (
        <section aria-labelledby="a-faire-reunion" className={CARTE}>
          <h2 id="a-faire-reunion" className="text-base font-semibold text-foreground">{t("backOffice.aFaire.reunion.titre")}</h2>
          {!reunion ? <p className="mt-2 text-sm text-muted-foreground">{t("backOffice.aFaire.rienDePrevu")}</p> : <Link href={ficheEvenement(reunion)} className="mt-2 block rounded-md hover:underline">
            <b className="block break-words text-sm font-semibold text-foreground">{reunion.titre}</b>
            <span className="block break-words text-sm text-muted-foreground">{quand}</span>
          </Link>}
        </section>
      )}
    </aside>
  );
}
