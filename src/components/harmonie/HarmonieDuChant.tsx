"use client";

// Feuille « Harmonie de ce chant » (H4, docs/spec-harmonie-accords.md). Elle
// s'ouvre depuis la page d'un chant et depuis une setlist : un bloc par passage
// (grille en chiffres, fonction, idées calculées puis idées de l'équipe), puis
// les idées sans passage, les idées écartées, le formulaire d'ajout et — dans
// une setlist — la transition vers le chant suivant. Jamais en mode louange.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TOUCHER_44 } from "@/lib/toucher44";
import { ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ChampSelect } from "@/components/ui/champ-select";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { compter } from "@/lib/usage";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import {
  ajouterIdee, ecarterSuggestion, getIdees, getRejets, modifierIdee,
  remettreSuggestion, suggestionsEcartees, supprimerIdee, type Idee, type Rejet,
} from "@/lib/firebase/harmonie";
import { apercuDuChangement, cinqPremieres, type Suggestion } from "@/lib/harmonie/suggestions";
import { harmonieDuChant, type AccordDuPassage, type Passage, type PassageAvecIdees } from "@/lib/harmonie/passages";
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
import { BoutonEcouter } from "@/components/harmonie/BoutonEcouter";

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

export function HarmonieDuChant(props: Props) {
  useStandaloneScrollLock(props.open);
  const { t } = useTranslation();
  return (
    <Drawer open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DrawerContent className="h-[67dvh] max-h-[67dvh] md:max-w-2xl md:mx-auto" data-idees-harmonie>
        <DrawerHeader className="relative z-10 shrink-0 bg-inherit pb-3">
          <DrawerTitle>{t("harmonie.titreChant")}</DrawerTitle>
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

type Bloc = {
  p: PassageAvecIdees;
  /** Les uid des reprises repliées dans ce bloc (le sien en premier). */
  uids: string[];
  nom: string;
  n: number;
  idees: Suggestion[];
  equipe: Idee[];
};

/** La grille d'un passage : chiffres, lettres dessous, et les accords à écouter. */
function grilleDuPassage(p: Passage) {
  const cle = (l: AccordDuPassage[]) => l.map((a) => a.chiffre).join(" ");
  if (p.boucle) {
    const suite = p.lignes.flat().filter((a, i, tous) => a.chiffre !== tous[i - 1]?.chiffre).slice(0, p.resume.length);
    return { chiffres: p.resume.join(" "), lignes: [suite.map((a) => a.texte)] };
  }
  const uniques = p.lignes.filter((l, i) => i === 0 || cle(l) !== cle(p.lignes[i - 1]));
  return { chiffres: uniques.map(cle).join(" · "), lignes: uniques.map((l) => l.map((a) => a.texte)) };
}

function Contenu({ slug, titre, sections, tonalite, tonaliteOrigine, instrument, onEssayer, suivant, onModuler, onClose, portee }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const { fiches } = useCatalogue();
  const [rejets, setRejets] = useState<Rejet[]>([]);
  const [idees, setIdees] = useState<Idee[]>([]);
  // Les passages dont « Voir plus » est ouvert.
  const [deplies, setDeplies] = useState<string[]>([]);

  useEffect(() => {
    let vivant = true;
    getRejets(slug).then((r) => vivant && setRejets(r)).catch(() => { /* rien d'écarté */ });
    getIdees(slug).then((i) => vivant && setIdees(i)).catch(() => { /* aucune idée */ });
    return () => { vivant = false; };
  }, [slug]);

  const { passages, sansPassage } = useMemo(
    () => harmonieDuChant(sections, tonalite, fiches, suggestionsEcartees(rejets), idees),
    [sections, tonalite, fiches, rejets, idees],
  );
  // Un bloc par passage ; les reprises d'une même section se replient dans le premier.
  const blocs = useMemo(() => {
    const parId = new Map<string, Bloc>();
    const sortie: Bloc[] = [];
    for (const p of passages) {
      const section = sections.find((x) => x.uid === p.uid);
      const b = parId.get(idDeSection(p.uid));
      if (!b) {
        const nouveau = { p, uids: [p.uid], nom: section ? formatSectionName(section, t) : p.nom, n: 1, idees: [...p.idees], equipe: [...p.ideesEquipe] };
        parId.set(idDeSection(p.uid), nouveau);
        sortie.push(nouveau);
        continue;
      }
      b.n++;
      b.uids.push(p.uid);
      for (const s of p.idees) if (!b.idees.some((x) => x.fiche.id === s.fiche.id)) b.idees.push(s);
      b.equipe.push(...p.ideesEquipe);
    }
    return sortie;
  }, [passages, sections, t]);

  // Les refus, rangés par fiche (un refus par section couverte, dans Firestore).
  const lignesEcartees = useMemo(() => {
    const parFiche = new Map<string, Rejet[]>();
    for (const r of rejets) {
      const id = r.suggestion.split("__")[0];
      parFiche.set(id, [...(parFiche.get(id) ?? []), r]);
    }
    return [...parFiche].map(([id, rs]) => ({ cle: id, nom: fiches.find((f) => f.id === id)?.nom ?? id, rejets: rs }));
  }, [rejets, fiches]);

  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";

  async function ecarter(s: Suggestion) {
    if (!user) return;
    // Un refus par section où la fiche s'applique, dans tout le chant : le format des refus ne change pas.
    const ids = passages.flatMap((p) => p.idees).filter((x) => x.fiche.id === s.fiche.id).map((x) => x.id);
    await Promise.all(ids.map((id) => ecarterSuggestion(slug, id, { uid: user.uid, auteur: nom })));
    compter("cmd.harmonie.suggestion");
    setRejets(await getRejets(slug));
  }

  const transition = suivant ? transitionEntre(tonalite, suivant.tonalite) : null;
  const ficheTransition = transition ? ficheDeLaTransition(transition, fiches) : undefined;
  const dernierAccord = passages.flatMap((p) => p.lignes.flat()).at(-1)?.texte;

  const equipe = useEquipe({
    slug, idees, instrument, tonalite, tonaliteOrigine: tonaliteOrigine ?? tonalite,
    moi: user ? { uid: user.uid, nom } : null, admin: isAdminUser(user),
    recharger: async () => setIdees(await getIdees(slug)),
  });

  const modulations = onModuler
    ? MODULATIONS.flatMap((m) => {
        const prop = modulationProposee(sections, tonalite, m);
        const fiche = fiches.find((f) => f.id === m.fiche);
        return prop && fiche ? [{ m, prop, fiche }] : [];
      })
    : [];
  const carteModulation = ({ m, prop, fiche }: (typeof modulations)[number]) => (
    <li key={m.fiche} className="rounded-xl bg-card p-3" data-modulation={m.fiche}>
      <Link href={`/harmonie/${fiche.id}`} className="font-semibold underline-offset-4 hover:underline">
        {fiche.nom}
      </Link>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t("harmonie.modulation.ou", { section: prop.sectionNom, ton: prop.tonaliteCible })}
        {prop.approche.length > 0 && (
          <>
            {" · "}
            <span className="font-chord font-semibold"><AccordTouchable etiquette={prop.approche.join(" – ")} visible /></span>
          </>
        )}
      </p>
      <Button size="sm" className="mt-2" onClick={() => onModuler?.(m, prop)}>
        {t("harmonie.appliquer")}
      </Button>
    </li>
  );
  const blocsDeModulation = (b: Bloc) => modulations.filter((x) => b.uids.includes(x.prop.sectionUid));
  // Une modulation dont la section n'a pas de bloc (cas limite) : en bas.
  const modulationsLibres = modulations.filter((x) => !blocs.some((b) => b.uids.includes(x.prop.sectionUid)));
  const titreModulation = (
    <h4 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.modulation.titre")}</h4>
  );

  return (
    <div className="min-h-0 overflow-y-auto px-4 pb-8">
      <p className="mb-3 text-sm text-muted-foreground">{titre}</p>

      <div className="space-y-5">
        {blocs.map((b) => {
          const { p } = b;
          const { chiffres, lignes } = grilleDuPassage(p);
          const { premieres, suite } = cinqPremieres(b.idees, instrument, 3);
          const montrees = deplies.includes(p.uid) ? [...premieres, ...suite] : premieres;
          const dernier = p.lignes.at(-1)?.at(-1);
          const x = dernier?.chiffre;
          const modulationsDuBloc = blocsDeModulation(b);
          return (
            <section
              key={p.uid}
              data-passage={p.uid}
              className="sec-rail"
              style={{ "--sec-c": `var(--sec-${p.type}, var(--sec-other))` } as CSSProperties}
            >
              <h3 className="text-sm font-semibold">
                {b.nom}
                {b.n > 1 && ` ×${b.n}`}
              </h3>
              {lignes.length > 0 && (
                <>
                  <p className="mt-1 text-base">
                    <span className="font-chord font-semibold text-[var(--chord-color)]">{chiffres}</span>
                    {p.boucle && <span className="ml-2 text-sm text-muted-foreground">{t("harmonie.boucle")}</span>}
                  </p>
                  <p className="font-chord text-sm text-muted-foreground">
                    {lignes.map((l, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <AccordTouchable etiquette={l.join(" – ")} visible />
                      </span>
                    ))}
                  </p>
                </>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`harmonie.fonction.${{ repos: "repos", "vers-refrain": "versRefrain", suspens: "suspens", "sans-accords": "sansAccords" }[p.fonction]}`, { x })}
              </p>
              {lignes.length > 0 && <BoutonEcouter className="mt-2" accords={lignes.flat()} />}

              {montrees.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {montrees.map((s) => {
                    const apercu = apercuDuChangement(s, tonalite);
                    const changements = s.endroits.flatMap((endroit) => {
                      const a = apercuDuChangement(s, tonalite, endroit);
                      return a ? [{ endroit, apres: a.apresListe }] : [];
                    });
                    return (
                      <li key={s.id} className="rounded-xl bg-card p-3" data-suggestion={s.id}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <Link href={`/harmonie/${s.fiche.id}`} className="font-semibold underline-offset-4 hover:underline">
                            {s.fiche.nom}
                          </Link>
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                            {t("harmonie.aVerifier")}
                          </span>
                        </div>
                        {apercu ? (
                          <p className="mt-1.5 text-base">
                            <span className="font-chord font-semibold"><AccordTouchable etiquette={apercu.avant} visible /></span>
                            <span className="mx-1.5 text-muted-foreground">→</span>
                            <span className="font-chord font-semibold"><AccordTouchable etiquette={apercu.apres} visible /></span>
                            {/* Le degré en petit à côté : la même idée se relit dans
                                n'importe quelle tonalité. */}
                            <span className="ml-2 text-sm text-[var(--chord-color)]">
                              {degres(apercu.avant, tonalite)}
                              {" → "}
                              {degres(apercu.apres, tonalite)}
                            </span>
                          </p>
                        ) : (
                          // Les idées sans remplacement d'accords (tag, intro absente)
                          // disent ce qu'elles proposent, avec les mots de la fiche.
                          s.fiche.avantApres && (
                            <ParagrapheFiche
                              className="mt-1.5 text-base text-muted-foreground"
                              texte={s.fiche.avantApres}
                              demiTons={semitonesTo(TON_DES_FICHES, tonalite)}
                              tonalite={tonalite}
                            />
                          )
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => montrerLEndroit(s.endroits[0], onClose, portee)}>
                            {t("harmonie.montrer")}
                          </Button>
                          {onEssayer && apercu && (
                            <Button size="sm" onClick={() => onEssayer(s, changements, b.nom)}>
                              {t("harmonie.essayer")}
                            </Button>
                          )}
                          {apercu && <BoutonEcouter avant={s.endroits[0].accords} apres={apercu.apresListe} />}
                          <button
                            type="button"
                            onClick={() => ecarter(s)}
                            className={`${TOUCHER_44} ml-auto text-sm text-muted-foreground underline underline-offset-4`}
                          >
                            {t("harmonie.neMarchePas")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!deplies.includes(p.uid) && suite.length > 0 && (
                <Button variant="secondary" size="sm" className={`${TOUCHER_44} mt-2`} onClick={() => setDeplies((d) => [...d, p.uid])}>
                  {t("harmonie.voirPlus")}
                </Button>
              )}
              {b.equipe.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {b.equipe.map((i) => <CarteIdee key={i.id} i={i} fiches={fiches} eq={equipe} />)}
                </ul>
              )}
              {modulationsDuBloc.length > 0 && (
                <div className="mt-3">
                  {titreModulation}
                  <ul className="space-y-2">{modulationsDuBloc.map(carteModulation)}</ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {modulationsLibres.length > 0 && (
        <section className="mt-5">
          {titreModulation}
          <ul className="space-y-2">{modulationsLibres.map(carteModulation)}</ul>
        </section>
      )}

      <section className="mt-5">
        <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.idee.titre")}</h3>
        {sansPassage.length === 0 && !equipe.ouvert && (
          <p className="rounded-xl bg-card px-3 py-2.5 text-sm text-muted-foreground">{t("harmonie.idee.aucune")}</p>
        )}
        <ul className="space-y-2">
          {sansPassage.map((i) => <CarteIdee key={i.id} i={i} fiches={fiches} eq={equipe} />)}
        </ul>
      </section>

      {lignesEcartees.length > 0 && (
        <details className="group mt-4">
          {/* Chevron du site au lieu du triangle du navigateur (retouche du 08/11/2026). */}
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
            {t("harmonie.ecartees", { count: lignesEcartees.length })}
            <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <ul className="mt-2 space-y-1.5">
            {lignesEcartees.map((ligne) => {
              // Qui a écarté l'idée (une fois chacun).
              const auteurs = [...new Set(ligne.rejets.map((r) => r.auteur).filter(Boolean))];
              return (
                <li key={ligne.cle} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm">
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
                        compter("cmd.harmonie.suggestion");
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

      <FormulaireIdee eq={equipe} fiches={fiches} passages={blocs.map((b) => ({ uid: b.p.uid, nom: b.nom }))} />

      {transition && suivant && (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.transition.titre")}</h3>
          <div className="rounded-xl bg-card p-3">
            <p className="text-base">
              {ficheTransition ? (
                <Link href={`/harmonie/${ficheTransition.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {ficheTransition.nom}
                </Link>
              ) : (
                t("harmonie.transition.titre")
              )}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {suivant.titre} · {suivant.tonalite}
              {transition.approche && (
                <>
                  {" · "}
                  <span className="font-chord font-semibold"><AccordTouchable etiquette={transition.approche} visible /></span>
                </>
              )}
            </p>
            {/* Le dernier accord du chant, l'approche s'il y en a, le 1 du chant suivant. */}
            <BoutonEcouter
              className="mt-2"
              accords={[dernierAccord, transition.approche, suivant.tonalite].filter((a): a is string => !!a)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

type Equipe = ReturnType<typeof useEquipe>;

/** L'état des idées de l'équipe (H3) : la liste vit dans les passages, le
 *  formulaire en bas ; les deux partagent cet état. */
function useEquipe({
  slug, idees, instrument, tonalite, tonaliteOrigine, moi, admin, recharger,
}: {
  slug: string;
  idees: Idee[];
  instrument: Instrument;
  tonalite: string;
  tonaliteOrigine: string;
  moi: { uid: string; nom: string } | null;
  admin: boolean;
  recharger: () => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [edite, setEdite] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [avant, setAvant] = useState("");
  const [apres, setApres] = useState("");
  const [fiche, setFiche] = useState("");
  const [passage, setPassage] = useState("");
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
    setOuvert(false); setEdite(null); setTexte(""); setAvant(""); setApres(""); setFiche(""); setPassage("");
  }

  async function enregistrer(passages: { uid: string; nom: string }[]) {
    if (!moi || !texte.trim()) return;
    const range = (accords: string) =>
      accords.trim() && versOrigine ? transposeLabel(accords.trim(), versOrigine, tonaliteOrigine) : accords.trim();
    // L'uid d'origine reste si le choix n'a pas changé (une reprise repliée garde le sien).
    const choisi = passage ? passages.find((p) => p.uid === passage || idDeSection(p.uid) === idDeSection(passage)) : undefined;
    const values = {
      texte: texte.trim(), avant: range(avant), apres: range(apres), ficheId: fiche,
      passage: choisi ? passage : "", passageNom: choisi?.nom ?? "",
    };
    if (edite) { await modifierIdee(slug, edite, values); compter("cmd.harmonie.idee.modifier"); }
    else { await ajouterIdee(slug, values, { uid: moi.uid, auteur: moi.nom, instrument }); compter("cmd.harmonie.idee.ajouter"); }
    reinitialiser();
    await recharger();
  }

  return {
    slug, moi, admin, recharger, ouvert, setOuvert, edite, setEdite, texte, setTexte, avant, setAvant, apres, setApres,
    fiche, setFiche, passage, setPassage, vues, lire, reinitialiser, enregistrer,
  };
}

/** Une idée écrite par l'équipe. */
function CarteIdee({ i, fiches, eq }: { i: Idee; fiches: Fiche[]; eq: Equipe }) {
  const { t } = useTranslation();
  const { moi, lire } = eq;
  return (
    <li className="rounded-xl bg-card p-3" data-idee={i.id}>
      <p className="text-base">{i.texte}</p>
      {(i.avant || i.apres) && (
        <p className="mt-1 text-base">
          <span className="font-chord font-semibold"><AccordTouchable etiquette={lire(i.avant)} visible /></span>
          <span className="mx-1.5 text-muted-foreground">→</span>
          <span className="font-chord font-semibold"><AccordTouchable etiquette={lire(i.apres)} visible /></span>
        </p>
      )}
      {i.ficheId && fiches.some((f) => f.id === i.ficheId) && (
        <Link href={`/harmonie/${i.ficheId}`} className="mt-0.5 block text-sm underline underline-offset-4">
          {fiches.find((f) => f.id === i.ficheId)!.nom}
        </Link>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        {i.auteur}
        {i.instrument && ` · ${t(`harmonie.instrument.${i.instrument}`)}`}
        {!eq.vues.includes(i.id) && (
          <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs">{t("harmonie.nouveau")}</span>
        )}
      </p>
      {(i.uid === moi?.uid || eq.admin) && (
        <div className="mt-2 flex gap-3 text-sm">
          {i.uid === moi?.uid && (
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                eq.setEdite(i.id); eq.setOuvert(true); eq.setTexte(i.texte);
                eq.setAvant(lire(i.avant)); eq.setApres(lire(i.apres)); eq.setFiche(i.ficheId ?? ""); eq.setPassage(i.passage ?? "");
              }}
            >
              {t("harmonie.idee.modifier")}
            </button>
          )}
          <button
            type="button"
            className="text-destructive underline underline-offset-4"
            onClick={async () => { await supprimerIdee(eq.slug, i.id); compter("cmd.harmonie.idee.supprimer"); await eq.recharger(); }}
          >
            {t("harmonie.idee.supprimer")}
          </button>
        </div>
      )}
    </li>
  );
}

/** Le formulaire d'ajout (ou de modification) d'une idée, avec son passage. */
function FormulaireIdee({ eq, fiches, passages }: { eq: Equipe; fiches: Fiche[]; passages: { uid: string; nom: string }[] }) {
  const { t } = useTranslation();
  return eq.ouvert ? (
    <div className="mt-2 space-y-2 rounded-xl bg-card p-3">
      <textarea
        value={eq.texte}
        onChange={(e) => eq.setTexte(e.target.value)}
        placeholder={t("harmonie.idee.texte")}
        aria-label={t("harmonie.idee.texte")}
        rows={2}
        className="w-full rounded-lg bg-secondary px-3 py-2 text-base"
      />
      <div className="flex gap-2">
        <input
          value={eq.avant}
          onChange={(e) => eq.setAvant(e.target.value)}
          placeholder={t("harmonie.idee.avant")}
          aria-label={t("harmonie.idee.avant")}
          className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-base"
        />
        <input
          value={eq.apres}
          onChange={(e) => eq.setApres(e.target.value)}
          placeholder={t("harmonie.idee.apres")}
          aria-label={t("harmonie.idee.apres")}
          className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-base"
        />
      </div>
      <ChampSelect
        value={passages.find((p) => idDeSection(p.uid) === idDeSection(eq.passage))?.uid ?? ""}
        onChange={(e) => eq.setPassage(e.target.value)}
        aria-label={t("harmonie.idee.passage")}
      >
        <option value="">{t("harmonie.idee.toutLeChant")}</option>
        {passages.map((p) => (
          <option key={p.uid} value={p.uid}>{p.nom}</option>
        ))}
      </ChampSelect>
      <ChampSelect
        value={eq.fiche}
        onChange={(e) => eq.setFiche(e.target.value)}
        aria-label={t("harmonie.idee.fiche")}
      >
        <option value="">{t("harmonie.idee.fiche")}</option>
        {fiches.map((f) => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </ChampSelect>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => eq.enregistrer(passages)} disabled={!eq.texte.trim()}>{t("harmonie.idee.enregistrer")}</Button>
        <Button size="sm" variant="secondary" onClick={eq.reinitialiser}>{t("harmonie.idee.annuler")}</Button>
      </div>
    </div>
  ) : (
    eq.moi && (
      <Button variant="secondary" size="sm" className={`${TOUCHER_44} mt-2`} onClick={() => eq.setOuvert(true)}>
        {t("harmonie.idee.ajouter")}
      </Button>
    )
  );
}
