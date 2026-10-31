"use client";

// Feuille « Idées d'harmonie » (lot 9, H2 · H3 · H4, docs/spec-harmonie.md).
// Elle s'ouvre depuis la page d'un chant et depuis une setlist. Trois parties :
// les idées calculées par les règles (5 au plus, « Voir plus » pour la suite),
// les idées écrites par l'équipe, et — dans une setlist — la transition vers le
// chant suivant. Jamais en mode louange.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import {
  ajouterIdee, ecarterSuggestion, getIdees, getRejets, modifierIdee,
  remettreSuggestion, suggestionsEcartees, supprimerIdee, type Idee, type Rejet,
} from "@/lib/firebase/harmonie";
import { apercuDuChangement, cinqPremieres, regrouper, suggestionsPour, type Suggestion } from "@/lib/harmonie/suggestions";
import { chiffreDuDegre, degresDeLaSuite } from "@/lib/harmonie/degres";
import { semitonesTo, transposeLabel } from "@/lib/transpose";
import { idDeSection } from "@/lib/setlist/sectionOrigins";
import { ficheDeLaTransition, transitionEntre } from "@/lib/harmonie/transitions";
import { modulationProposee, type ModulationProposee } from "@/lib/harmonie/modulation";
import { MODULATIONS, type Modulation } from "@/lib/harmonie/regles";
import { useCatalogue } from "@/lib/harmonie/useHarmonie";
import type { Endroit } from "@/lib/harmonie/motifs";
import { formatSectionName } from "@/lib/chordpro/parser";
import type { ChordProSection } from "@/types/chordPro";
import type { Fiche, Instrument } from "@/types/harmonie";
import { ParagrapheFiche, TON_DES_FICHES } from "@/components/harmonie/TexteFiche";
import { AccordTouchable } from "@/components/accords/AccordTouchable";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Le chant : son slug sert de clé aux idées et aux refus. */
  slug: string;
  titre: string;
  sections: ChordProSection[];
  /** Tonalité jouée (celle de la setlist si elle en impose une). */
  tonalite: string;
  /** Tonalité d'origine du chant : les idées de l'équipe s'y enregistrent,
   *  pour se relire juste quel que soit le ton choisi par chacun. */
  tonaliteOrigine?: string;
  instrument: Instrument;
  /** Dans une setlist seulement : essayer l'idée dans Ma version, dans la
   *  section choisie — `changements` : un par endroit de cette section. */
  onEssayer?: (
    s: Suggestion,
    changements: { endroit: Endroit; apres: string[] }[],
    sectionNom: string,
  ) => void;
  /** Chant suivant de la setlist, pour la transition (lecture seule). */
  suivant?: { titre: string; tonalite: string };
  /** Poser une modulation sur la setlist — seulement pour qui peut la modifier. */
  onModuler?: (m: Modulation, prop: ModulationProposee) => void;
  /** Dans une setlist : sélecteur du chant lu. Les identifiants de section se
   *  répètent d'un chant à l'autre (« chorus-3-2 ») : « Montrer » cherche là. */
  portee?: string;
};

/** La section visée, dans le chant lu : d'abord son occurrence, sinon (structure
 *  modifiée dans la setlist, qui renumérote les occurrences) la première
 *  occurrence de la même section. */
function trouverLaSection(sectionUid: string, portee?: string): HTMLElement | null {
  // Toutes les sections sous la portée (une fusion mélangée enveloppe chaque
  // section de son chant à part).
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(portee ? `${portee} [data-section-uids]` : "[data-section-uids]"),
  );
  const uids = (el: HTMLElement) => (el.dataset.sectionUids ?? "").split(" ");
  return (
    sections.find((el) => uids(el).includes(sectionUid)) ??
    sections.find((el) => uids(el).some((u) => idDeSection(u) === idDeSection(sectionUid))) ??
    null
  );
}

/** Montre l'endroit visé dans la partition affichée derrière la feuille : les
 *  sections portent déjà `data-section-uids` (le sommaire s'en sert). La
 *  feuille se ferme, la section défile au centre et s'entoure un instant. */
function montrerLEndroit(endroit: Endroit, fermer: () => void, portee?: string) {
  const el = trouverLaSection(endroit.sectionUid, portee);
  if (!el) return;
  fermer();
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("harmonie-surligne");
    setTimeout(() => el.classList.remove("harmonie-surligne"), 2500);
  });
}

/** Où en est le « Montrer i/n » de chaque carte : le prochain pas à montrer.
 *  Au niveau du module, pour survivre à la fermeture de la feuille (Contenu est
 *  démonté, et dans une setlist la feuille entière) ; perdu au rechargement. */
const pasMontres = new Map<string, number>();

type SectionDeCarte = NonNullable<Suggestion["sections"]>[number];

/** Le nom d'une section de la carte, tel que le chant l'affiche. */
function nomDeLaSection(c: SectionDeCarte, duChant: ChordProSection[], t: TFunction): string {
  const section = duChant.find((x) => x.uid === c.uid);
  return section ? formatSectionName(section, t) : c.nom;
}

/** « Couplets 1 et 2 · Refrain » : les sections d'une carte, les couplets de
 *  numéros consécutifs contractés. */
function nomsDesSections(cartes: SectionDeCarte[], duChant: ChordProSection[], t: TFunction): string {
  const elements = cartes.map((c) => {
    const section = duChant.find((x) => x.uid === c.uid);
    const entier = section && !section.suffix && section.number && /^\d+$/.test(section.number);
    return {
      nom: nomDeLaSection(c, duChant, t),
      base: section ? formatSectionName({ ...section, number: undefined, suffix: undefined }, t) : "",
      numero: entier ? Number(section.number) : null,
    };
  });
  const blocs: string[] = [];
  for (let i = 0; i < elements.length; ) {
    let j = i + 1;
    const e = elements[i];
    if (e.numero !== null) {
      while (j < elements.length && elements[j].base === e.base && elements[j].numero === e.numero + (j - i)) j++;
    }
    const a = e.numero;
    const b = e.numero !== null ? e.numero + (j - i - 1) : null;
    if (j - i === 1) blocs.push(e.nom);
    else if (j - i === 2) blocs.push(t("harmonie.sectionsEt", { type: e.base, a, b }));
    else blocs.push(t("harmonie.sectionsA", { type: e.base, a, b }));
    i = j;
  }
  return blocs.join(" · ");
}

export function IdeesSheet(props: Props) {
  useStandaloneScrollLock(props.open);
  const { t } = useTranslation();
  return (
    <Drawer open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DrawerContent className="max-h-[88vh] md:max-w-2xl md:mx-auto" data-idees-harmonie>
        <DrawerHeader className="pb-1">
          <DrawerTitle>{t("harmonie.idees")}</DrawerTitle>
        </DrawerHeader>
        {props.open && <Contenu {...props} />}
      </DrawerContent>
    </Drawer>
  );
}

/** « 4 – 5 » : les degrés d'une suite d'accords, en chiffres (décision du
 *  17/09/2026 : le degré s'écrit en petit à côté du nom de l'accord). */
function degres(accords: string, tonalite: string): string {
  const suite = degresDeLaSuite(accords.split(/\s*[–-]\s*/), tonalite);
  return suite.length ? suite.map(chiffreDuDegre).join(" – ") : "";
}

function Contenu({ slug, titre, sections, tonalite, tonaliteOrigine, instrument, onEssayer, suivant, onModuler, onClose, portee }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const { fiches } = useCatalogue();
  const [rejets, setRejets] = useState<Rejet[]>([]);
  const [idees, setIdees] = useState<Idee[]>([]);
  const [tout, setTout] = useState(false);
  // Carte dont le choix « Essayer dans Ma version, où ? » est déplié.
  const [essayerOuvert, setEssayerOuvert] = useState<string | null>(null);
  // Pour redessiner le « Montrer i/n » (le compteur vit hors du composant).
  const [, redessiner] = useState(0);

  useEffect(() => {
    let vivant = true;
    getRejets(slug).then((r) => vivant && setRejets(r)).catch(() => { /* rien d'écarté */ });
    getIdees(slug).then((i) => vivant && setIdees(i)).catch(() => { /* aucune idée */ });
    return () => { vivant = false; };
  }, [slug]);

  const suggestions = useMemo(
    () => regrouper(suggestionsPour(sections, tonalite, fiches, suggestionsEcartees(rejets)), tonalite),
    [sections, tonalite, fiches, rejets],
  );
  // Les cartes sans le filtre des refus : la liste « écartées » y range chaque
  // refus dans sa carte.
  const cartesCompletes = useMemo(
    () => regrouper(suggestionsPour(sections, tonalite, fiches), tonalite),
    [sections, tonalite, fiches],
  );
  const lignesEcartees = useMemo(() => {
    const lignes: { cle: string; nom: string; rejets: Rejet[] }[] = [];
    const rangees = new Set<string>();
    for (const carte of cartesCompletes) {
      const siens = rejets.filter((r) => (carte.ids ?? [carte.id]).includes(r.suggestion));
      if (!siens.length) continue;
      siens.forEach((r) => rangees.add(r.id));
      lignes.push({ cle: siens.map((r) => r.id).join("+"), nom: carte.fiche.nom, rejets: siens });
    }
    // Un refus qui ne tombe dans aucune carte (chant modifié depuis) : sa ligne.
    for (const r of rejets) {
      if (rangees.has(r.id)) continue;
      lignes.push({
        cle: r.id,
        nom: fiches.find((f) => f.id === r.suggestion.split("__")[0])?.nom ?? r.suggestion,
        rejets: [r],
      });
    }
    return lignes;
  }, [cartesCompletes, rejets, fiches]);
  const { premieres, suite } = useMemo(() => cinqPremieres(suggestions, instrument), [suggestions, instrument]);
  const montrees = tout ? [...premieres, ...suite] : premieres;

  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";

  async function ecarter(s: Suggestion) {
    if (!user) return;
    // Un refus par section couverte : le format des refus ne change pas.
    await Promise.all((s.ids ?? [s.id]).map((id) => ecarterSuggestion(slug, id, { uid: user.uid, auteur: nom })));
    setRejets(await getRejets(slug));
  }

  const transition = suivant ? transitionEntre(tonalite, suivant.tonalite) : null;
  const ficheTransition = transition ? ficheDeLaTransition(transition, fiches) : undefined;

  return (
    <div className="overflow-y-auto px-4 pb-8">
      <p className="mb-3 text-[13px] text-muted-foreground">{titre}</p>

      {montrees.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{t("harmonie.aucuneFiche")}</p>
      ) : (
        <ul className="space-y-2">
          {montrees.map((s) => {
            const apercu = apercuDuChangement(s, tonalite);
            const cartes = s.sections ?? [];
            const cle = `${slug}::${s.id}`;
            const prochain = (pasMontres.get(cle) ?? 0) % Math.max(cartes.length, 1);
            // Le changement appliqué à tous les endroits d'une section.
            const changementsDe = (c: SectionDeCarte) =>
              c.endroits.flatMap((endroit) => {
                const a = apercuDuChangement(s, tonalite, endroit);
                return a ? [{ endroit, apres: a.apresListe }] : [];
              });
            return (
              <li key={s.id} className="rounded-xl bg-card p-3" data-suggestion={s.id}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link href={`/harmonie/${s.fiche.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {s.fiche.nom}
                  </Link>
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {t("harmonie.aVerifier")}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {nomsDesSections(cartes, sections, t)}
                  {cartes.length === 1 && s.endroits.length > 1 && ` · ${t("harmonie.endroits", { count: s.endroits.length })}`}
                </p>
                {apercu ? (
                  <p className="mt-1.5 text-[15px]">
                    <span className="font-chord font-semibold"><AccordTouchable etiquette={apercu.avant} visible /></span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-chord font-semibold"><AccordTouchable etiquette={apercu.apres} visible /></span>
                    {/* Le degré en petit à côté : la même idée se relit dans
                        n'importe quelle tonalité. */}
                    <span className="ml-2 text-[13px] text-muted-foreground">
                      {degres(apercu.avant, tonalite)}
                      {" → "}
                      {degres(apercu.apres, tonalite)}
                    </span>
                  </p>
                ) : (
                  // Les idées sans remplacement d'accords (tag, intro absente)
                  // disent ce qu'elles proposent, avec les mots de la fiche.
                  // Rendus comme sur la fiche : gras, et accords dans la tonalité du chant.
                  s.fiche.avantApres && (
                    <ParagrapheFiche
                      className="mt-1.5 text-[15px] text-muted-foreground"
                      texte={s.fiche.avantApres}
                      demiTons={semitonesTo(TON_DES_FICHES, tonalite)}
                      tonalite={tonalite}
                    />
                  )
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Un pas par section : le surlignage se fait par section.
                      // Une section absente de la partition lue (structure
                      // retouchée dans la setlist) est sautée.
                      let k = prochain;
                      for (let n = 0; n < cartes.length; n++, k = (k + 1) % cartes.length) {
                        if (trouverLaSection(cartes[k].uid, portee)) break;
                      }
                      pasMontres.set(cle, (k + 1) % cartes.length);
                      redessiner((n) => n + 1);
                      montrerLEndroit(cartes[k].endroits[0], onClose, portee);
                    }}
                  >
                    {cartes.length > 1
                      ? t("harmonie.montrerPas", { i: prochain + 1, n: cartes.length })
                      : t("harmonie.montrer")}
                  </Button>
                  {onEssayer && apercu && cartes.length === 1 && (
                    <Button size="sm" onClick={() => onEssayer(s, changementsDe(cartes[0]), nomDeLaSection(cartes[0], sections, t))}>
                      {t("harmonie.essayer")}
                    </Button>
                  )}
                  {onEssayer && apercu && cartes.length > 1 && (
                    <Button
                      size="sm"
                      aria-expanded={essayerOuvert === s.id}
                      onClick={() => setEssayerOuvert(essayerOuvert === s.id ? null : s.id)}
                    >
                      {t("harmonie.essayerOu")}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => ecarter(s)}
                    className="ml-auto text-[13px] text-muted-foreground underline underline-offset-4"
                  >
                    {t("harmonie.neMarchePas")}
                  </button>
                </div>
                {onEssayer && apercu && cartes.length > 1 && essayerOuvert === s.id && (
                  <div className="mt-2">
                    <p className="text-[13px] text-muted-foreground">{t("harmonie.essayerOuTitre")}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {cartes.map((c) => {
                        const nomC = nomDeLaSection(c, sections, t);
                        return (
                          <Button key={c.uid} size="sm" variant="secondary" onClick={() => onEssayer(s, changementsDe(c), nomC)}>
                            {nomC}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!tout && suite.length > 0 && (
        <button
          type="button"
          onClick={() => setTout(true)}
          className="mt-3 w-full rounded-xl bg-card py-2.5 text-[15px] font-medium"
        >
          {t("harmonie.voirPlus")}
        </button>
      )}

      {lignesEcartees.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] text-muted-foreground">
            {t("harmonie.ecartees", { count: lignesEcartees.length })}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {lignesEcartees.map((ligne) => {
              // Qui a écarté l'idée (une fois chacun).
              const auteurs = [...new Set(ligne.rejets.map((r) => r.auteur).filter(Boolean))];
              return (
                <li key={ligne.cle} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {/* Quelle idée, et qui l'a écartée. */}
                    {ligne.nom}
                    {auteurs.length > 0 && ` · ${auteurs.join(", ")}`}
                  </span>
                  {(isAdminUser(user) || ligne.rejets.every((r) => r.uid === user?.uid)) && (
                    <button
                      type="button"
                      className="shrink-0 underline underline-offset-4"
                      onClick={async () => {
                        await Promise.all(ligne.rejets.map((r) => remettreSuggestion(slug, r.suggestion)));
                        setRejets(await getRejets(slug));
                      }}
                    >
                      {t("harmonie.remettre")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* Modulations (famille 8) : elles ne remplacent pas un accord, elles
          font monter le dernier refrain — donc elles touchent la setlist. */}
      {onModuler && (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.modulation.titre")}</h3>
          <ul className="space-y-2">
            {MODULATIONS.map((m) => {
              const prop = modulationProposee(sections, tonalite, m);
              const fiche = fiches.find((f) => f.id === m.fiche);
              if (!prop || !fiche) return null;
              return (
                <li key={m.fiche} className="rounded-xl bg-card p-3" data-modulation={m.fiche}>
                  <Link href={`/harmonie/${fiche.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {fiche.nom}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {t("harmonie.modulation.ou", { section: prop.sectionNom, ton: prop.tonaliteCible })}
                    {prop.approche.length > 0 && (
                      <>
                        {" · "}
                        <span className="font-chord font-semibold"><AccordTouchable etiquette={prop.approche.join(" – ")} visible /></span>
                      </>
                    )}
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => onModuler(m, prop)}>
                    {t("harmonie.appliquer")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {transition && suivant && (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.transition.titre")}</h3>
          <div className="rounded-xl bg-card p-3">
            <p className="text-[15px]">
              {ficheTransition ? (
                <Link href={`/harmonie/${ficheTransition.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {ficheTransition.nom}
                </Link>
              ) : (
                t("harmonie.transition.titre")
              )}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {suivant.titre} · {suivant.tonalite}
              {transition.approche && (
                <>
                  {" · "}
                  <span className="font-chord font-semibold"><AccordTouchable etiquette={transition.approche} visible /></span>
                </>
              )}
            </p>
          </div>
        </section>
      )}

      <IdeesEquipe
        slug={slug}
        idees={idees}
        instrument={instrument}
        fiches={fiches}
        tonalite={tonalite}
        tonaliteOrigine={tonaliteOrigine ?? tonalite}
        moi={user ? { uid: user.uid, nom } : null}
        admin={isAdminUser(user)}
        recharger={async () => setIdees(await getIdees(slug))}
      />
    </div>
  );
}

/** Les idées écrites par l'équipe (H3), attachées au chant. */
function IdeesEquipe({
  slug, idees, instrument, fiches, tonalite, tonaliteOrigine, moi, admin, recharger,
}: {
  slug: string;
  idees: Idee[];
  instrument: Instrument;
  fiches: Fiche[];
  tonalite: string;
  tonaliteOrigine: string;
  moi: { uid: string; nom: string } | null;
  admin: boolean;
  recharger: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [edite, setEdite] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [avant, setAvant] = useState("");
  const [apres, setApres] = useState("");
  const [fiche, setFiche] = useState("");
  // Les accords s'écrivent dans la tonalité qu'on lit, et se rangent dans
  // celle du chant : l'idée reste juste pour qui le lit autrement.
  const versOrigine = semitonesTo(tonalite, tonaliteOrigine);
  const versLue = semitonesTo(tonaliteOrigine, tonalite);
  const lire = (accords?: string) =>
    accords && versLue ? transposeLabel(accords, versLue, tonalite) : accords ?? "";

  // « nouveau » tant qu'on ne les a pas vues sur cet appareil.
  const [vues, setVues] = useState<string[]>([]);
  useEffect(() => {
    try { setVues(JSON.parse(localStorage.getItem("harmonie-vues") ?? "[]") as string[]); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!idees.length) return;
    const tous = idees.map((i) => i.id);
    try { localStorage.setItem("harmonie-vues", JSON.stringify(tous)); } catch { /* ignore */ }
  }, [idees]);

  function reinitialiser() {
    setOuvert(false); setEdite(null); setTexte(""); setAvant(""); setApres(""); setFiche("");
  }

  async function enregistrer() {
    if (!moi || !texte.trim()) return;
    const range = (accords: string) =>
      accords.trim() && versOrigine ? transposeLabel(accords.trim(), versOrigine, tonaliteOrigine) : accords.trim();
    const values = { texte: texte.trim(), avant: range(avant), apres: range(apres), ficheId: fiche };
    if (edite) await modifierIdee(slug, edite, values);
    else await ajouterIdee(slug, values, { uid: moi.uid, auteur: moi.nom, instrument });
    reinitialiser();
    await recharger();
  }

  return (
    <section className="mt-5">
      <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.idee.titre")}</h3>
      {idees.length === 0 && !ouvert && (
        <p className="rounded-xl bg-card px-3 py-2.5 text-[13px] text-muted-foreground">{t("harmonie.idee.aucune")}</p>
      )}
      <ul className="space-y-2">
        {idees.map((i) => (
          <li key={i.id} className="rounded-xl bg-card p-3" data-idee={i.id}>
            <p className="text-[15px]">{i.texte}</p>
            {(i.avant || i.apres) && (
              <p className="mt-1 text-[15px]">
                <span className="font-chord font-semibold"><AccordTouchable etiquette={lire(i.avant)} visible /></span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className="font-chord font-semibold"><AccordTouchable etiquette={lire(i.apres)} visible /></span>
              </p>
            )}
            {i.ficheId && fiches.some((f) => f.id === i.ficheId) && (
              <Link href={`/harmonie/${i.ficheId}`} className="mt-0.5 block text-[13px] underline underline-offset-4">
                {fiches.find((f) => f.id === i.ficheId)!.nom}
              </Link>
            )}
            <p className="mt-1 text-[13px] text-muted-foreground">
              {i.auteur}
              {i.instrument && ` · ${t(`harmonie.instrument.${i.instrument}`)}`}
              {!vues.includes(i.id) && (
                <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[11px]">{t("harmonie.nouveau")}</span>
              )}
            </p>
            {(i.uid === moi?.uid || admin) && (
              <div className="mt-2 flex gap-3 text-[13px]">
                {i.uid === moi?.uid && (
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => {
                      setEdite(i.id); setOuvert(true); setTexte(i.texte);
                      setAvant(lire(i.avant)); setApres(lire(i.apres)); setFiche(i.ficheId ?? "");
                    }}
                  >
                    {t("harmonie.idee.modifier")}
                  </button>
                )}
                <button
                  type="button"
                  className="text-destructive underline underline-offset-4"
                  onClick={async () => { await supprimerIdee(slug, i.id); await recharger(); }}
                >
                  {t("harmonie.idee.supprimer")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {ouvert ? (
        <div className="mt-2 space-y-2 rounded-xl bg-card p-3">
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder={t("harmonie.idee.texte")}
            aria-label={t("harmonie.idee.texte")}
            rows={2}
            className="w-full rounded-lg bg-secondary px-3 py-2 text-[15px]"
          />
          <div className="flex gap-2">
            <input
              value={avant}
              onChange={(e) => setAvant(e.target.value)}
              placeholder={t("harmonie.idee.avant")}
              aria-label={t("harmonie.idee.avant")}
              className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-[15px]"
            />
            <input
              value={apres}
              onChange={(e) => setApres(e.target.value)}
              placeholder={t("harmonie.idee.apres")}
              aria-label={t("harmonie.idee.apres")}
              className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-[15px]"
            />
          </div>
          <select
            value={fiche}
            onChange={(e) => setFiche(e.target.value)}
            aria-label={t("harmonie.idee.fiche")}
            className="h-10 w-full rounded-lg bg-secondary px-2 text-[15px]"
          >
            <option value="">{t("harmonie.idee.fiche")}</option>
            {fiches.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={enregistrer} disabled={!texte.trim()}>{t("harmonie.idee.enregistrer")}</Button>
            <Button size="sm" variant="secondary" onClick={reinitialiser}>{t("harmonie.idee.annuler")}</Button>
          </div>
        </div>
      ) : (
        moi && (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="mt-2 w-full rounded-xl bg-card py-2.5 text-[15px] font-medium"
          >
            {t("harmonie.idee.ajouter")}
          </button>
        )
      )}
    </section>
  );
}
