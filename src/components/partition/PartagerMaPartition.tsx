"use client";

// « Partager ma partition » (docs/spec-ma-partition.md, « Partage ») : feuille du bas au téléphone, popover de 380 px
// ancré au menu « Je lis » ailleurs. Chaque case s'enregistre aussitôt, par la même file que les retouches.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useDisposition } from "@/hooks/useDisposition";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { jourDeParis } from "@/lib/evenements/bascule";
import { getSetlist, getSetlistsFrom } from "@/lib/firebase/setlists";
import { listProfiles } from "@/lib/firebase/users";
import { equipeDuService } from "@/lib/setlist/equipeDuService";
import { nomCourt } from "@/lib/setlist/partage";
import { instrumentDuNom, loadPlanningData, normalizeName, splitNames, type PlanningData } from "@/lib/planning/names";
import type { useMesPartitions } from "@/lib/partition/useMesPartitions";
import type { FSSetlist } from "@/types/setList";
import type { UserProfile } from "@/types/user";

export type PartageProps = {
  slug: string;
  uid: string;
  /** Le service dont on propose l'équipe : la setlist ouverte ; sinon la première à venir qui joue ce chant. */
  setlistId: string | null;
  mp: ReturnType<typeof useMesPartitions>;
};

function Ligne({ coche, onCoche, nom, detail, tout, onTout }: {
  coche: boolean; onCoche: (oui: boolean) => void; nom: string; detail?: string;
  tout: boolean; onTout: (oui: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
        <Checkbox checked={coche} onCheckedChange={(v) => onCoche(v === true)} aria-label={nom} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{nom}</span>
          {detail && <span className="block truncate text-xs" style={{ color: "var(--graphite)" }}>{detail}</span>}
        </span>
      </label>
      {coche && (
        <label className="ml-7 flex min-h-11 cursor-pointer items-center gap-3 py-1">
          <Checkbox checked={tout} onCheckedChange={(v) => onTout(v === true)} aria-label={`${t("maPartition.partage.tout")} : ${nom}`} />
          <span className="text-xs text-muted-foreground">{t("maPartition.partage.tout")}</span>
        </label>
      )}
    </li>
  );
}

function Contenu({ slug, uid, setlistId, mp }: PartageProps) {
  const { t } = useTranslation();
  const [profils, setProfils] = useState<UserProfile[]>([]);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [service, setService] = useState<FSSetlist | null>(null);
  const [recherche, setRecherche] = useState("");
  const mienne = mp.mes[slug];
  const mpRef = useRef(mp);
  mpRef.current = mp;
  const chaine = useRef<Promise<unknown>>(Promise.resolve());
  // Une case après l'autre : chaque écriture part de la partition à jour.
  const enchainer = (f: (m: typeof mp) => Promise<void>) => {
    chaine.current = chaine.current.then(() => f(mpRef.current)).catch(() => { /* la case se recoche au prochain tap */ });
  };

  useEffect(() => {
    let vivant = true;
    listProfiles().then((p) => vivant && setProfils(p)).catch(() => {});
    loadPlanningData().then((p) => vivant && setPlanning(p)).catch(() => {});
    (setlistId
      ? getSetlist(setlistId)
      : getSetlistsFrom(jourDeParis(), 30).then((l) => l.find((s) => s.items.some((i) => i.songSlug === slug)) ?? null)
    ).then((s) => vivant && setService(s)).catch(() => {});
    return () => { vivant = false; };
  }, [setlistId, slug]);

  const autres = useMemo(() => profils.filter((p) => p.uid !== uid), [profils, uid]);
  const equipe = useMemo(() => {
    if (!planning || !service) return [];
    const parUid = new Map<string, { profil: UserProfile; roles: string[] }>();
    for (const [cle, noms] of equipeDuService(planning, service)) {
      for (const nom of splitNames(noms)) {
        const profil = autres.find((p) => p.planningName && normalizeName(p.planningName) === normalizeName(nom));
        if (!profil) continue;
        const role = [t(cle), instrumentDuNom(noms, nom)].filter(Boolean).join(" · ");
        const deja = parUid.get(profil.uid);
        if (deja) deja.roles.push(role);
        else parUid.set(profil.uid, { profil, roles: [role] });
      }
    }
    return [...parUid.values()];
  }, [planning, service, autres, t]);
  const dansEquipe = new Set(equipe.map((e) => e.profil.uid));
  const partage = mienne?.sharedWith ?? [];
  const deja = autres.filter((p) => partage.includes(p.uid) && !dansEquipe.has(p.uid));
  const q = normalizeName(recherche);
  const trouves = q ? autres.filter((p) => !dansEquipe.has(p.uid) && !partage.includes(p.uid) && normalizeName(nomCourt(p)).includes(q)).slice(0, 8) : [];

  const ligne = (p: UserProfile, detail?: string) => (
    <Ligne
      key={p.uid} nom={nomCourt(p)} detail={detail}
      coche={partage.includes(p.uid)} onCoche={(oui) => enchainer((m) => m.partagerAvec(slug, p.uid, oui))}
      tout={mp.partageTout.includes(p.uid)} onTout={(oui) => enchainer((m) => m.partagerTout(p.uid, oui))}
    />
  );
  const titre = (texte: string) => <h3 className="mb-1 mt-3 text-xs font-semibold text-muted-foreground">{texte}</h3>;

  if (!mienne) return null;
  return (
    <div data-partage className="text-foreground">
      {equipe.length > 0 && (
        <section>
          {titre(t("maPartition.partage.ceDimanche"))}
          <ul>{equipe.map((e) => ligne(e.profil, e.roles.join(", ")))}</ul>
        </section>
      )}
      {deja.length > 0 && (
        <section>
          {titre(t("maPartition.partage.partageeAvec"))}
          <ul>{deja.map((p) => ligne(p))}</ul>
        </section>
      )}
      <section>
        {titre(t("maPartition.partage.chercher"))}
        <Input
          value={recherche} onChange={(e) => setRecherche(e.target.value)} type="search"
          placeholder={t("maPartition.partage.chercherPlaceholder")} aria-label={t("maPartition.partage.chercher")} className="h-11"
        />
        <ul>{trouves.map((p) => ligne(p))}</ul>
        {q && trouves.length === 0 && <p className="py-2 text-xs text-muted-foreground">{t("maPartition.partage.personne")}</p>}
      </section>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-2">
        <span className="text-sm">{t("maPartition.partage.traits")}</span>
        <Switch checked={mienne.sharedTraits} onCheckedChange={(oui) => enchainer((m) => m.partagerTraits(slug, oui))} aria-label={t("maPartition.partage.traits")} />
      </label>
    </div>
  );
}

/** `children` : le menu « Je lis », qui sert d'ancre au popover. */
export function PartagerMaPartition({ ouvert, onOpenChange, children, ...partage }: PartageProps & {
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const telephone = useDisposition() === "telephone";
  useStandaloneScrollLock(ouvert && telephone);
  const titre = t("maPartition.partage.titre");
  const entete = (
    <div className="flex shrink-0 items-center justify-between pl-4 pr-1">
      <h2 className="font-semibold text-foreground">{titre}</h2>
      <button
        type="button" onClick={() => onOpenChange(false)} aria-label={t("common.buttons.close")}
        className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
  return telephone ? (
    <>
      {children}
      <Drawer open={ouvert} onOpenChange={onOpenChange}>
        <DrawerContent data-testid="partage-feuille" className="max-h-[88vh] md:mx-auto md:max-w-3xl">
          <DrawerTitle className="sr-only">{titre}</DrawerTitle>
          <DrawerDescription className="sr-only">{titre}</DrawerDescription>
          <div className="pt-2">{entete}</div>
          <div className="overflow-y-auto px-4 pb-6">{ouvert && <Contenu {...partage} />}</div>
        </DrawerContent>
      </Drawer>
    </>
  ) : (
    <Popover open={ouvert} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild><span className="inline-flex">{children}</span></PopoverAnchor>
      <PopoverContent
        data-testid="partage-popover" align="start" aria-label={titre}
        // Le menu « Je lis », en se fermant, rend le focus à son déclencheur : ce n'est pas un clic dehors.
        onFocusOutside={(e) => e.preventDefault()}
        className="flex max-h-[min(560px,var(--radix-popover-content-available-height))] w-[380px] max-w-[calc(100vw-16px)] flex-col overflow-hidden p-0"
      >
        <div className="border-b border-border">{entete}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{ouvert && <Contenu {...partage} />}</div>
      </PopoverContent>
    </Popover>
  );
}
