"use client";

// Fiche d'une tâche, à lire (lot U4 bis, B4, docs/spec-pages-en-grand.md, Q8 ; planches
// `mes-taches-ordinateur`, `mes-taches-fiche-telephone`) : pôle, titre, l'état à trois
// positions (À faire · En cours · Terminée), puis échéance, responsable, répétition,
// évènement, « Quand c'est fait, prévenir », lien et note. « Modifier » ouvre le formulaire
// d'aujourd'hui (`TacheForm`). En grand, à droite de la liste, sans « Retour » ; en un volet,
// la page `/taches/[pole]/[id]`, avec « ‹ Tâches ».
// Back-Office › Tâches (agencement v18, B1, B2 ; planche `v18-bo-taches`) : la même fiche, titrée
// en h2 sous l'en-tête « Tâches » en grand (en un volet, son propre `EnTetePage` avec « ‹ Tâches »),
// « Modifier » et « ⋯ › Supprimer », « Note » et « Historique » côte à côte ; en grand, « Modifier »
// ouvre le formulaire dans le volet au lieu de la feuille.

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Bell, CalendarDays, Check, ChevronLeft, Link2, Minus, Pencil, Repeat, Ticket, Trash2, UserRound } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { MenuActions } from "@/components/layout/MenuActions";
import { TacheForm } from "@/components/taches/TacheForm";
import { depuisQuand } from "@/components/taches/TacheLigne";
import { texteRetour } from "@/components/taches/retour";
import { useMesTaches } from "@/components/taches/SectionTaches";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { getProfile, listProfiles, useProfile } from "@/lib/firebase/users";
import { polesDe } from "@/lib/access";
import { choisirEtat, deleteTache, updateTache, type TacheValues } from "@/lib/firebase/taches";
import { lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { prevenirFait, prevenirResponsable } from "@/lib/taches/prevenir";
import { cn } from "@/lib/utils";
import type { EtatFois, Fois, Tache, TachePole } from "@/types/tache";
import type { UserProfile } from "@/types/user";

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ETATS = ["afaire", "encours", "terminee"] as const;
/** Date courte de l'historique : « 21 sept. » / « 9月21日 ». */
const jourCourt = (iso: string, lang: string) => new Date(iso).toLocaleDateString(locale(lang), { day: "numeric", month: "short" });
type Etat = (typeof ETATS)[number];

/** La fois que montre la fiche : celle de `date`, sinon la première encore à faire, sinon la
 *  première visible ; une tâche sans fois visible se montre à son échéance, à faire. */
function laLigne(tache: Tache, lignes: Ligne[], date: string | null): Ligne {
  return (date ? lignes.find((l) => l.date === date) : undefined)
    ?? lignes.find((l) => l.fois?.etat !== "terminee")
    ?? lignes[0]
    ?? { tache, date: date ?? tache.echeance, fois: null };
}

export function FicheTache({ pole, id, date }: { pole: string; id: string; date: string | null }) {
  const { t } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { poles, items, chargement, aujourdhui, backOffice } = useMesTaches();
  const item = items.find((x) => x.tache.pole === pole && x.tache.id === id);

  let contenu: React.ReactNode;
  if (!poles.includes(pole as TachePole)) contenu = <p className="text-sm text-muted-foreground">{t("taches.pasMembre")}</p>;
  else if (!item) contenu = chargement ? null : <p className="text-sm text-muted-foreground">{t("taches.introuvable")}</p>;
  else contenu = <Fiche key={`${pole}/${id}/${date ?? ""}`} ligne={laLigne(item.tache, lignesDeTache(item.tache, item.fois, aujourdhui), date)} toutesLesFois={item.fois} />;

  return (
    <div className={cn("space-y-4 pb-10", backOffice
      // Back-Office (R10) : la fiche ne pose plus de marge en grand ; en un volet, son en-tête la porte.
      ? (deuxVolets ? "" : "[&>p]:mx-[var(--marge-page)] [&>p]:mt-6")
      : deuxVolets ? "px-6 pt-6 xl:px-9" : "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6")}>
      {!deuxVolets && !backOffice && (
        <Link href="/taches" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("taches.title")}
        </Link>
      )}
      {contenu}
    </div>
  );
}

function Fiche({ ligne, toutesLesFois }: { ligne: Ligne; toutesLesFois: Fois[] }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const titreId = useId();
  const deuxVolets = useDeuxVolets();
  const { user } = useProfile();
  const { reload, parNom, racine, backOffice, aujourdhui } = useMesTaches();
  const { tache, date, fois } = ligne;
  const [modifier, setModifier] = useState(false);
  const [membres, setMembres] = useState<UserProfile[]>([]);
  const [retour, setRetour] = useState("");
  // Historique (B1) : le nom de l'auteur se lit dans son profil (une lecture, profils lisibles par tout connecté).
  const [auteur, setAuteur] = useState<string | null>();
  const etat: Etat = fois?.etat ?? "afaire";
  const dansLeVolet = backOffice && deuxVolets;

  useEffect(() => {
    if (!backOffice || !tache.auteurUid) return;
    let vivant = true;
    getProfile(tache.auteurUid)
      .then((p) => { if (vivant) setAuteur(p ? `${p.firstName} ${p.lastName}`.trim() || p.email : null); })
      .catch(() => { if (vivant) setAuteur(null); });
    return () => { vivant = false; };
  }, [backOffice, tache.auteurUid]);

  useEffect(() => {
    if (!modifier) return;
    listProfiles().then((all) => setMembres(all.filter((p) => polesDe(p).includes(tache.pole)))).catch(() => {});
  }, [modifier, tache.pole]);

  async function choisir(nouvel: Etat) {
    if (!user || nouvel === etat) return;
    setRetour("");
    await choisirEtat(tache.pole, tache.id, date, fois, nouvel === "afaire" ? null : (nouvel as EtatFois), { uid: user.uid, nom: parNom });
    await reload();
    if (nouvel === "terminee" && tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(tache.pole, tache.id, date), tache));
    }
  }

  async function enregistrer(values: TacheValues) {
    if (!user) return;
    await updateTache(tache.pole, tache.id, values);
    setModifier(false);
    await reload();
    // Nommé par quelqu'un d'autre : le nouveau responsable est prévenu.
    if (values.responsableUid && values.responsableUid !== user.uid && values.responsableUid !== tache.responsableUid) {
      prevenirResponsable(tache.pole, tache.id);
    }
  }

  async function supprimer() {
    await deleteTache(tache.pole, tache.id, toutesLesFois);
    setModifier(false);
    await reload();
    router.push(backOffice ? `${racine}/${tache.pole}` : "/taches");
  }

  const jour = majuscule(new Date(`${date}T12:00:00`).toLocaleDateString(locale(i18n.language), { weekday: "long", day: "numeric", month: "long" }));
  const prevenir = tache.prevenir
    ? "pole" in tache.prevenir
      ? t("taches.prevenirPole", { pole: t(`taches.pole.${tache.prevenir.pole}`) })
      : t("taches.prevenirRegie", { service: tache.prevenir.regie })
    : null;
  const sousTitre = etat === "encours" && fois
    ? `${depuisQuand(t, fois)} · ${t("taches.commenceePar", { nom: fois.parNom })}`
    : etat === "terminee" && fois ? t("taches.faitePar", { nom: fois.parNom }) : null;
  const enRetard = backOffice && etat !== "terminee" && date < aujourdhui;
  const lignes: [React.ReactNode, string, React.ReactNode][] = [
    [<CalendarDays key="i" />, t("taches.champs.echeance"), enRetard ? (
      <span key="v" className="inline-flex flex-wrap items-center gap-2">
        {jour}
        <span className="rounded bg-destructive/10 px-1.5 py-px text-xs font-semibold text-destructive">{t("taches.fiche.enRetard")}</span>
      </span>
    ) : jour],
    [<UserRound key="i" />, t("taches.champs.responsable"), tache.responsableUid ? tache.responsableNom : t("taches.pourTous")],
    [<Repeat key="i" />, t("taches.champs.repetition"), t(`taches.rythme.${tache.repetition?.rythme ?? "aucun"}`)],
  ];
  if (tache.evenement) {
    lignes.push([<Ticket key="i" />, t("taches.champs.evenement"),
      <Link key="v" href={`/evenements/${tache.evenement.id}`} className="font-medium underline underline-offset-2">{tache.evenement.titre}</Link>]);
  }
  if (prevenir) lignes.push([<Bell key="i" />, t("taches.champs.prevenir"), prevenir]);
  if (tache.lien) {
    // Seul un lien web s'ouvre ; un autre schéma (`javascript:`, `data:`…) se lit en texte.
    lignes.push([<Link2 key="i" />, t("taches.champs.lien"), /^https?:\/\//i.test(tache.lien)
      ? <a key="v" href={tache.lien} target="_blank" rel="noopener noreferrer" className="break-all font-medium underline underline-offset-2">{tache.lien.replace(/^https?:\/\//, "")}</a>
      : <span key="v" className="break-all">{tache.lien}</span>]);
  }

  // Historique (B1), le plus récent d'abord : où en est la fois, puis la création.
  const historique: string[] = [];
  if (fois?.etat === "encours") historique.push(`${t("taches.commenceePar", { nom: fois.parNom })} · ${jourCourt(fois.debutLe || fois.le, i18n.language)}`);
  if (fois?.etat === "terminee") historique.push(`${t("taches.faitePar", { nom: fois.parNom })} · ${jourCourt(fois.le, i18n.language)}`);
  if (auteur !== undefined) historique.push(`${t("taches.fiche.creeePar", { nom: auteur ?? t("taches.fiche.unMembre") })} · ${jourCourt(tache.createdAt, i18n.language)}`);
  const SousTitre = dansLeVolet ? "h3" : "h2";

  const boutonModifier = (
    <button
      type="button"
      onClick={() => setModifier(true)}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-transform duration-150 active:scale-[.97]",
        backOffice ? "h-9 bg-background shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary" : "bg-secondary",
      )}
    >
      <Pencil className="h-4 w-4" aria-hidden />
      {t("taches.fiche.modifier")}
    </button>
  );
  const menu = backOffice && (
    <MenuActions actions={[{
      label: t("taches.supprimer"), icone: Trash2, destructif: true, onSelect: supprimer,
      confirmer: { titre: t("taches.confirmerSuppression"), action: t("common.buttons.delete") },
    }]} />
  );
  const badgePole = (
    <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
      {t("taches.prevenirPole", { pole: t(`taches.pole.${tache.pole}`) })}
    </span>
  );

  // En grand au Back-Office, « Modifier » remplace la fiche par le formulaire (B2).
  if (dansLeVolet && modifier) {
    return <TacheForm enLigne open pole={tache.pole} initial={tache} membres={membres} onSubmit={enregistrer} onClose={() => setModifier(false)} />;
  }

  return (
    <article aria-labelledby={titreId} className={cn("space-y-4", backOffice && !deuxVolets && "[&>*:not(header)]:mx-[var(--marge-page)]")}>
      {backOffice && !deuxVolets ? (
        // Un volet : la fiche est une page, avec le seul retour (R8) et son titre en h1.
        <EnTetePage
          retour={{ href: `${racine}/${tache.pole}`, label: t("taches.title") }}
          titre={<span id={titreId}>{tache.titre}</span>}
          sousTitre={t("taches.prevenirPole", { pole: t(`taches.pole.${tache.pole}`) })}
          outils={<>{boutonModifier}{menu}</>}
        />
      ) : (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {badgePole}
            {dansLeVolet
              ? <h2 id={titreId} className="mt-2 text-2xl font-bold leading-tight tracking-tight text-balance">{tache.titre}</h2>
              : <h1 id={titreId} className="mt-2 text-2xl font-bold leading-tight tracking-tight text-balance lg:text-[28px]">{tache.titre}</h1>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {boutonModifier}
            {menu}
          </div>
        </header>
      )}

      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}

      <section className={cn("raised rounded-2xl px-4 py-3.5", deuxVolets && "flex flex-wrap items-center gap-x-4 gap-y-3")}>
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <span className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
            etat === "terminee" ? "border-foreground bg-foreground text-background" : etat === "encours" ? "border-foreground" : "border-muted-foreground/50",
          )}>
            {etat === "terminee" && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
            {etat === "encours" && <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold">{t(`taches.etat.${etat}`)}</p>
            {sousTitre && <p className="text-[13px] text-muted-foreground">{sousTitre}</p>}
          </div>
        </div>
        <div role="radiogroup" aria-label={t("taches.etat.titre")} className={cn("flex gap-0.5 rounded-full bg-secondary p-1 text-sm", !deuxVolets && "mt-3")}>
          {ETATS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={etat === e}
              onClick={() => choisir(e)}
              className={cn(
                "min-h-9 flex-1 whitespace-nowrap rounded-full px-4 font-semibold transition-colors duration-150",
                etat === e ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`taches.etat.${e}`)}
            </button>
          ))}
        </div>
      </section>

      <dl className="raised rounded-2xl px-4 py-1">
        {lignes.map(([icone, label, valeur]) => (
          <div key={label} className={cn("flex gap-3 border-t border-border/70 py-2.5 first:border-t-0", deuxVolets ? "items-center" : "items-start")}>
            <span className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4" aria-hidden>{icone}</span>
            <div className={cn("min-w-0 flex-1", deuxVolets && "flex items-center gap-3")}>
              <dt className={cn("text-muted-foreground", deuxVolets ? "w-48 shrink-0 text-sm" : "text-[13px]")}>{label}</dt>
              <dd className="min-w-0 text-[15px]">{valeur}</dd>
            </div>
          </div>
        ))}
      </dl>

      {backOffice ? (
        // « Note » et « Historique » côte à côte en grand (B1).
        <div className={cn("grid items-start gap-4", tache.note && "md:grid-cols-2")}>
          {tache.note && (
            <section className="raised rounded-2xl px-4 py-3">
              <SousTitre className="text-[15px] font-bold">{t("taches.champs.note")}</SousTitre>
              <p className="mt-1 whitespace-pre-wrap text-[15px]">{tache.note}</p>
            </section>
          )}
          <section className="raised rounded-2xl px-4 py-3">
            <SousTitre className="text-[15px] font-bold">{t("taches.fiche.historique")}</SousTitre>
            <ul className="mt-1">
              {historique.map((h) => <li key={h} className="border-t border-border/70 py-1.5 text-sm first:border-t-0">{h}</li>)}
            </ul>
          </section>
        </div>
      ) : tache.note && (
        <section className="raised rounded-2xl px-4 py-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground">{t("taches.champs.note")}</h2>
          <p className="mt-0.5 whitespace-pre-wrap text-[15px]">{tache.note}</p>
        </section>
      )}

      {/* La feuille : l'App, et le Back-Office en un volet (Supprimer est alors dans « ⋯ »). */}
      <TacheForm
        open={modifier}
        pole={tache.pole}
        initial={tache}
        membres={membres}
        onSubmit={enregistrer}
        onDelete={backOffice ? undefined : supprimer}
        onClose={() => setModifier(false)}
      />
    </article>
  );
}
