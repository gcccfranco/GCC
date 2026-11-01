import type { SongContent } from "@/lib/api/songs";
import type { ChordProSection } from "@/types/chordPro";
import type { FSSetlist } from "@/types/setList";
import { paroleDeLigne } from "@/components/song/copyLyrics";
import { itemAst } from "@/lib/chordpro/itemContent";
import { isDp } from "@/lib/setlist/dp";
import { playedSections } from "@/lib/setlist/playedSections";
import { estUnChant } from "@/lib/setlist/propositions";

// Export d'une setlist au format projet de FreeShow (`.project`, JSON), pour la régie
// (docs/spec-export-freeshow.md, lot FS). Fonctions pures : la fabrication se fait dans le navigateur.

/** Au-delà de ce nombre de caractères (ponctuation de fin retirée), une ligne se coupe en deux sur la diapo. */
export const LIGNE_LONGUE = 30;
/** La virgule de coupe doit tomber entre ces deux fractions de la ligne, sinon on coupe à l'espace. */
export const COUPE_VIRGULE_MIN = 0.35;
export const COUPE_VIRGULE_MAX = 0.65;

const HANZI = /[㐀-鿿]/;
const HANZI_G = /[㐀-鿿]/g;
const PONCTUATION_FIN = /[,.;:!?…\s]+$/;
const COUPE_ZH = /[，、；。！？]/;

// ───────────────────────── Découpe ─────────────────────────

/** Coupe une ligne longue en deux : à la virgule la plus proche du milieu si elle est dans la zone
 *  centrale, sinon à l'espace le plus proche du milieu. Sans espace : une seule ligne. */
function couperEnDeux(texte: string): string[] {
  const milieu = texte.length / 2;
  const plusProche = (positions: number[]) =>
    positions.reduce<number | null>((m, p) => (m === null || Math.abs(p - milieu) < Math.abs(m - milieu) ? p : m), null);
  const positions = (re: RegExp) => [...texte.matchAll(re)].map((m) => m.index!);

  const virgules = positions(/,/g).filter((p) => {
    const f = p / texte.length;
    return f >= COUPE_VIRGULE_MIN && f <= COUPE_VIRGULE_MAX && texte.slice(0, p).trim() && texte.slice(p + 1).trim();
  });
  const virgule = plusProche(virgules);
  if (virgule !== null) return [texte.slice(0, virgule).trim(), texte.slice(virgule + 1).trim()];

  const espace = plusProche(positions(/ /g).filter((p) => texte.slice(0, p).trim() && texte.slice(p + 1).trim()));
  if (espace !== null) return [texte.slice(0, espace).trim(), texte.slice(espace + 1).trim()];
  return [texte];
}

/** FS7 : lignes d'une section (déjà nettoyées) → diapos françaises, chacune sa liste de lignes (une ou deux). */
export function decouperFrancais(lignes: string[]): string[][] {
  const propres = lignes.map((l) => l.replace(PONCTUATION_FIN, "").trim()).filter(Boolean);
  const diapos: string[][] = [];
  for (let i = 0; i < propres.length; i++) {
    const ligne = propres[i];
    if (ligne.length > LIGNE_LONGUE) {
      diapos.push(couperEnDeux(ligne));
    } else if (i + 1 < propres.length && propres[i + 1].length <= LIGNE_LONGUE) {
      diapos.push([ligne, propres[i + 1]]);
      i++;
    } else {
      diapos.push([ligne]);
    }
  }
  return diapos;
}

/** FS8 : une diapo par demi-phrase ; le pinyin de la ligne (syllabes séparées par des espaces) est réparti
 *  selon le nombre de caractères chinois de chaque morceau, le dernier prenant le reste. */
export function decouperChinois(
  lignes: { texte: string; pinyin: string | null }[],
): { caracteres: string; pinyin: string }[] {
  const diapos: { caracteres: string; pinyin: string }[] = [];
  for (const { texte, pinyin } of lignes) {
    const morceaux = texte.split(COUPE_ZH).map((m) => m.trim()).filter(Boolean);
    const syllabes = (pinyin ?? "").split(/\s+/).filter(Boolean);
    let reste = syllabes;
    morceaux.forEach((caracteres, i) => {
      const n = i === morceaux.length - 1 ? reste.length : (caracteres.match(HANZI_G) ?? []).length;
      diapos.push({ caracteres, pinyin: reste.slice(0, n).join(" ") });
      reste = reste.slice(n);
    });
  }
  return diapos;
}

/** Une ligne est « chinoise » si elle contient un caractère chinois. */
export function estLigneChinoise(texte: string): boolean {
  return HANZI.test(texte);
}

// ───────────────────────── Groupes (FS5) ─────────────────────────

const COULEURS: Record<string, string> = {
  "Couplet 1": "#39CCCC",
  "Couplet 2": "#0074D9",
  "Couplet 3": "#001f3f",
  "Couplet 4": "#7FDBFF",
  "Refrain 1": "#2ECC40",
  "Refrain 2": "#01FF70",
  Pont: "#FFFFFF",
  "Pont 2": "#d1d1d1",
  Dp: "#FF4136",
};
const GRIS = "#AAAAAA";

/** Nom, couleur et groupe global FreeShow d'une section, d'après son type et son numéro (pas son libellé). */
export function nomDeGroupe(section: ChordProSection): { nom: string; couleur: string; globalGroup?: string } {
  const n = parseInt(section.number ?? "", 10) || 1;
  let nom: string;
  let globalGroup: string | undefined;
  if (isDp(section)) nom = "Dp";
  else if (section.type === "verse") {
    nom = `Couplet ${n}`;
    if (n === 1) globalGroup = "verse";
  } else if (section.type === "chorus") {
    nom = `Refrain ${n}`;
    if (n === 1) globalGroup = "chorus";
  } else if (section.type === "bridge") {
    nom = n === 1 ? "Pont" : `Pont ${n}`;
    if (n === 1) globalGroup = "bridge";
  } else if (section.type === "prechorus") nom = "Pré-refrain";
  else if (section.type === "postchorus") nom = "Post-refrain";
  else if (section.type === "outro") nom = "Fin";
  else if (section.type === "intro") nom = "Intro";
  else nom = "Autre";
  const couleur = COULEURS[nom] ?? GRIS;
  return globalGroup ? { nom, couleur, globalGroup } : { nom, couleur };
}

// ───────────────────────── Types FreeShow ─────────────────────────

export type FreeShowTexte = { value: string; style: string };
export type FreeShowLigne = { align: string; text: FreeShowTexte[] };
export type FreeShowItem = {
  type: "text";
  lines: FreeShowLigne[];
  style: string;
  align: string;
  auto: true;
  textFit: "shrinkToFit";
  autoFontSize: number;
};
export type FreeShowSlide = {
  group: string | null;
  color: string | null;
  settings: Record<string, never>;
  notes: string;
  items: FreeShowItem[];
  globalGroup?: string;
  children?: string[];
};
export type FreeShowLayoutEntree = { id: string; children?: Record<string, Record<string, never>> };
export type FreeShowShow = {
  name: string;
  private: false;
  category: "presentation";
  settings: { activeLayout: string; template: null; customFonts: string[] };
  timestamps: { created: number; modified: number; used: null };
  quickAccess: Record<string, never>;
  meta: Record<string, never>;
  slides: Record<string, FreeShowSlide>;
  layouts: Record<string, { name: string; notes: string; slides: FreeShowLayoutEntree[] }>;
  media: Record<string, never>;
};
export type FreeShowProjet = {
  project: {
    name: string;
    created: number;
    modified: number;
    used: number;
    parent: string;
    shows: { id: string; index: number }[];
    id: string;
  };
  parentFolder: string;
  shows: Record<string, FreeShowShow>;
  categories: { presentation: { name: string; icon: string } };
  files: string[];
};

// ───────────────────────── Styles (FS6) ─────────────────────────

const ZONE_PAROLES = "top:88px;left:50px;height:904px;width:1820px;";
const ZONE_TITRE = "padding: 0px 0px 0px 0px;left: 240px;top: 352.005px;width: 1440px;height: 376.005px;";
const STYLE_FR =
  "text-shadow: 0 0 0 rgb(0 0 0 / 0);font-size: 100px;font-weight: bold;text-transform: uppercase;font-family: 'Century Gothic';color: #f3f4f7;";
const STYLE_ZH = "font-weight: bold;font-family:'KaiTi';font-size:150px;color:#f3f4f7;";
const STYLE_PINYIN = "font-weight: bold;font-size:80px;font-family:'Corbel';color:#f3f4f7;";

function item(zone: string, lignes: { texte: string; style: string }[]): FreeShowItem {
  return {
    type: "text",
    lines: lignes.map((l) => ({ align: "text-align: center;", text: [{ value: l.texte, style: l.style }] })),
    style: zone,
    align: "align-items:center;",
    auto: true,
    textFit: "shrinkToFit",
    autoFontSize: 100,
  };
}

// ───────────────────────── Fabrication ─────────────────────────

/** Nom de projet FreeShow d'après la date d'une setlist : « 2026-11-01 » → « 01/11/26 ». */
export function nomProjetFreeShow(date: string): string {
  const [a, m, j] = date.split("-");
  return `${j}/${m}/${a.slice(-2)}`;
}

/** Nom du fichier : « 2026-11-01 » → « 011126.project ». */
export function nomFichierFreeShow(date: string): string {
  return `${nomProjetFreeShow(date).replace(/\//g, "")}.project`;
}

/** Identifiant à la FreeShow : 11 caractères hexadécimaux. */
function idAleatoire(): string {
  let id = "";
  while (id.length < 11) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

type Diapo = { lignes: { texte: string; style: string }[] };

/** Diapos de paroles d'une section ; vide si elle n'a aucune parole. */
function diaposDeSection(section: ChordProSection): Diapo[] {
  const lignes = section.lines
    .map((l) => ({ texte: paroleDeLigne(l), pinyin: l.pinyin?.trim() || null }))
    .filter((l) => l.texte);
  if (lignes.some((l) => estLigneChinoise(l.texte))) {
    return decouperChinois(lignes).map((d) => ({
      lignes: [
        { texte: d.caracteres, style: STYLE_ZH },
        ...(d.pinyin ? [{ texte: d.pinyin, style: STYLE_PINYIN }] : []),
      ],
    }));
  }
  return decouperFrancais(lignes.map((l) => l.texte)).map((d) => ({
    lignes: d.map((texte) => ({ texte, style: STYLE_FR })),
  }));
}

export function fabriquerProjetFreeShow(
  setlist: Pick<FSSetlist, "date" | "items">,
  contents: Record<string, SongContent>,
  options: { maintenant?: number; nouvelId?: () => string } = {},
): FreeShowProjet {
  const maintenant = options.maintenant ?? Date.now();
  const nouvelId = options.nouvelId ?? idAleatoire;

  const fabriquerShow = (it: FSSetlist["items"][number]): FreeShowShow => {
    const titres =
      it.type === "fusion" && it.fusionSongs
        ? it.fusionSongs.map((f) => itemAst(f, contents[f.songSlug])?.metadata.title)
        : [itemAst(it, contents[it.songSlug])?.metadata.title];
    const titre = titres.filter(Boolean).join(" / ") || it.songSlug;

    const slides: Record<string, FreeShowSlide> = {};
    const entrees: FreeShowLayoutEntree[] = [];

    const idTitre = nouvelId();
    slides[idTitre] = {
      group: ".",
      color: "",
      settings: {},
      notes: "",
      items: [item(ZONE_TITRE, [{ texte: titre, style: estLigneChinoise(titre) ? STYLE_ZH : STYLE_FR }])],
    };
    entrees.push({ id: idTitre });

    // Une reprise rejoue le même groupe. Les occurrences d'une même section ont des `uid` différents
    // (structure de l'item) : on reconnaît la section à son `id` et à ses paroles.
    const vus = new Map<string, FreeShowLayoutEntree>();
    for (const section of playedSections(it, contents)) {
      const diapos = diaposDeSection(section);
      if (!diapos.length) continue;
      const cle = `${section.id}|${section.lines.map(paroleDeLigne).join("\n")}`;
      const deja = vus.get(cle);
      if (deja) {
        entrees.push({ id: deja.id, children: deja.children });
        continue;
      }
      const { nom, couleur, globalGroup } = nomDeGroupe(section);
      const idTete = nouvelId();
      const filles = diapos.slice(1).map((d) => {
        const id = nouvelId();
        slides[id] = { group: null, color: "", settings: {}, notes: "", items: [item(ZONE_PAROLES, d.lignes)] };
        return id;
      });
      slides[idTete] = {
        group: nom,
        color: couleur,
        settings: {},
        notes: "",
        items: [item(ZONE_PAROLES, diapos[0].lignes)],
        ...(globalGroup ? { globalGroup } : {}),
        children: filles,
      };
      const entree: FreeShowLayoutEntree = { id: idTete, children: Object.fromEntries(filles.map((f) => [f, {}])) };
      vus.set(cle, entree);
      entrees.push({ id: entree.id, children: entree.children });
    }

    const idFin = nouvelId();
    slides[idFin] = { group: "Rien", color: null, settings: {}, notes: "", items: [] };
    entrees.push({ id: idFin });

    const idLayout = nouvelId();
    return {
      name: titre,
      private: false,
      category: "presentation",
      settings: { activeLayout: idLayout, template: null, customFonts: [] },
      timestamps: { created: maintenant, modified: maintenant, used: null },
      quickAccess: {},
      meta: {},
      slides,
      layouts: { [idLayout]: { name: "Par défaut", notes: "", slides: entrees } },
      media: {},
    };
  };

  const shows: Record<string, FreeShowShow> = {};
  const liste: { id: string; index: number }[] = [];
  [...setlist.items]
    .filter(estUnChant)
    .sort((a, b) => a.position - b.position)
    .forEach((it, index) => {
      const id = nouvelId();
      shows[id] = fabriquerShow(it);
      liste.push({ id, index });
    });

  return {
    project: {
      name: nomProjetFreeShow(setlist.date),
      created: maintenant,
      modified: maintenant,
      used: maintenant,
      parent: "/",
      shows: liste,
      id: nouvelId(),
    },
    parentFolder: "",
    shows,
    categories: { presentation: { name: "Chants", icon: "cross" } },
    files: [],
  };
}
