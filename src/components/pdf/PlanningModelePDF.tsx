import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ColonneModele, LigneExport, PageExport } from "@/lib/planning/modeles";

// PDF d'un planning au modèle de son onglet du Google Sheet (lot U2, P7,
// docs/spec-planning-2027.md) : une page A4 par `PageExport` (pagesExport,
// modeles.ts). En-tête commun des groupes (église, logo réduit, titre,
// période, horaire), puis le tableau à la mise en forme de SON onglet ; rien
// en bas de page. Composant pur : tout le texte arrive déjà écrit, en français
// comme le Sheet (Q10), quelle que soit la langue de l'interface.

// Polices libres (OFL, licences à côté dans public/fonts/) : Lora pour
// l'en-tête, Carlito pour Calibri et Gelasio pour Georgia (mêmes mesures, les
// originales sont propriétaires), Ma Shan Zheng réduite aux caractères du nom
// chinois de l'église, Source Han Sans pour toute case en chinois. Chargées au
// moment d'exporter ; le PDF n'embarque que les caractères utilisés (Q11).
Font.register({ family: "Lora", fonts: [{ src: "/fonts/Lora-Regular.ttf", fontWeight: 400 }] });
Font.register({
  family: "Carlito",
  fonts: [
    { src: "/fonts/Carlito-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Carlito-Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "Gelasio",
  fonts: [
    { src: "/fonts/Gelasio-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Gelasio-Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({ family: "MaShanZheng", fonts: [{ src: "/fonts/MaShanZheng-eglise.ttf", fontWeight: 400 }] });
Font.register({ family: "HanSansModele", fonts: [{ src: "/fonts/SourceHanSansCN-Light.ttf", fontWeight: 400 }] });

const A4 = { portrait: [595.28, 841.89], paysage: [841.89, 595.28] } as const;
const MARGE_X = 36;
const MARGE_HAUT = 30;
const MARGE_BAS = 28;
const PX = 0.75; // 1 px du Sheet = 0,75 pt
// Lignes de l'en-tête : sur toute la largeur, centrées.
const ENTETE = { fontFamily: "Lora", alignSelf: "stretch" as const, textAlign: "center" as const };
/** Pas de césure dans une case : un nom ou un titre de chant ne se coupe pas d'un tiret. */
const sansCesure = (mot: string) => [mot];
const CHINOIS = /[⺀-鿿豈-﫿＀-￯]/;

/** Hauteur d'une rangée du tableau à la taille de police donnée. */
const hauteurRangee = (taille: number) => taille * 1.25 + 6;

/** Colonnes voisines au même libellé : un seul en-tête (Choristes). */
function entetesFusionnes(colonnes: ColonneModele[]): { entete: string; largeur: number; fond?: string }[] {
  const out: { entete: string; largeur: number; fond?: string }[] = [];
  colonnes.forEach((c, i) => {
    const prec = out[out.length - 1];
    if (i > 0 && prec && c.entete === colonnes[i - 1].entete) prec.largeur += c.largeur;
    else out.push({ entete: c.entete, largeur: c.largeur, fond: c.fondEntete });
  });
  return out;
}

function PageModele({ page, logo }: { page: PageExport; logo: string }) {
  const m = page.modele;
  const [largeurPage, hauteurPage] = A4[m.orientation];
  const police = m.policeTableau === "Georgia" ? "Gelasio" : "Carlito";
  const aDuChinois = CHINOIS.test(JSON.stringify(page.blocs));
  const famille = aDuChinois ? [police, "HanSansModele"] : police;

  // ── Échelle : le tableau tient sur la page, en largeur et en hauteur ──
  const fusion = m.fusion;
  const largeurNaturelle = (page.colonnes.reduce((s, c) => s + c.largeur, 0) + (fusion?.largeur ?? 0)) * PX;
  const disponible = largeurPage - 2 * MARGE_X;
  const rangees =
    1 + (page.bandeau ? 1 : 0) + page.blocs.reduce((s, b) => s + b.lignes.length + (b.titre ? 1 : 0), 0);
  const tailleLogo = m.orientation === "portrait" ? 112 : 84;
  const hauteurEnTete = MARGE_HAUT + 30 + 14 + tailleLogo + 14 + 28 + 20 + (page.horaire ? 20 : 0) + 22;
  const echelle = Math.min(
    1,
    disponible / largeurNaturelle,
    (hauteurPage - hauteurEnTete - MARGE_BAS) / (rangees * hauteurRangee(m.taille)),
  );
  const taille = m.taille * echelle;
  const largeur = (px: number) => px * PX * echelle;
  const hRangee = hauteurRangee(taille);
  const bordure = { borderColor: m.couleurs.bordure, borderStyle: "solid" as const };
  const alignement = m.alignement === "centre" ? ("center" as const) : ("left" as const);

  const caseStyle = (px: number, extra: Record<string, unknown> = {}) => ({
    width: largeur(px),
    minHeight: hRangee,
    paddingHorizontal: 3 * echelle + 1,
    justifyContent: "center" as const,
    borderRightWidth: 0.6,
    ...bordure,
    ...extra,
  });
  const texte = (valeur: string, extra: Record<string, unknown> = {}) =>
    valeur ? <Text hyphenationCallback={sansCesure} style={{ textAlign: alignement, ...extra }}>{valeur}</Text> : null;

  const ligne = (l: LigneExport, k: number) => {
    const fond = l.alterne ? m.couleurs.alterne : undefined;
    const [date, ...cases] = l.cellules;
    const [colDate, ...colCases] = page.colonnes;
    return (
      <View key={k} style={{ flexDirection: "row", borderBottomWidth: 0.6, ...bordure, backgroundColor: fond }}>
        <View style={caseStyle(colDate.largeur, { backgroundColor: m.couleurs.date ?? fond })}>
          {texte(date, { fontWeight: m.dateGras ? 700 : 400, color: m.couleurs.texteDate })}
        </View>
        {l.special ? (
          // Fidélité musiciens : le dimanche spécial s'écrit sur toute la ligne.
          <View style={caseStyle(colCases.reduce((s, c) => s + c.largeur, 0))}>
            {texte(l.special, { fontWeight: 700, textAlign: "center" })}
          </View>
        ) : (
          colCases.map((c, j) => (
            <View key={c.cle} style={caseStyle(c.largeur, { backgroundColor: c.fond ?? fond })}>
              {texte(cases[j], { color: c.texte, fontWeight: c.cle === "moment" ? 700 : 400 })}
            </View>
          ))
        )}
      </View>
    );
  };

  /** La colonne fusionnée d'un bloc : le mois (Fidélité musiciens), la classe (EDD). */
  const caseFusion = (valeur: string) =>
    fusion && (
      <View
        style={{
          width: largeur(fusion.largeur),
          justifyContent: "center",
          backgroundColor: m.couleurs.fusion,
          borderRightWidth: 0.6,
          borderBottomWidth: 0.6,
          ...bordure,
        }}
      >
        {texte(valeur, { fontWeight: 700, textAlign: "center", fontSize: m.assemblage === "classes" ? taille * 1.2 : taille })}
      </View>
    );

  const largeurTableau = largeurNaturelle * echelle;
  const pleineLargeur = (valeur: string, fond: string | undefined, couleur: string | undefined, gauche = false) => (
    <View
      style={{
        minHeight: hRangee,
        justifyContent: "center",
        paddingHorizontal: 4,
        backgroundColor: fond,
        borderRightWidth: 0.6,
        borderBottomWidth: 0.6,
        ...bordure,
      }}
    >
      <Text style={{ fontWeight: 700, color: couleur, textAlign: gauche ? "left" : "center" }}>{valeur}</Text>
    </View>
  );

  return (
    <Page
      size="A4"
      orientation={m.orientation === "paysage" ? "landscape" : "portrait"}
      style={{ paddingTop: MARGE_HAUT, paddingHorizontal: MARGE_X, paddingBottom: MARGE_BAS, color: "#000000" }}
    >
      {/* ── En-tête commun (Q11) : église, logo, titre, période, horaire ── */}
      <View style={{ alignItems: "center" }}>
        <Text
          style={
            m.eglise === "zh"
              ? { ...ENTETE, fontFamily: "MaShanZheng", fontSize: 28 }
              : { ...ENTETE, fontSize: 22 }
          }
        >
          {page.eglise}
        </Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf, pas une balise <img> */}
        <Image src={logo} style={{ width: tailleLogo, height: tailleLogo, marginTop: 14, marginBottom: 14 }} />
        <Text style={{ ...ENTETE, fontSize: 22 }}>{page.titre}</Text>
        <Text style={{ ...ENTETE, fontSize: 16, marginTop: 8 }}>{page.periode}</Text>
        {page.horaire && <Text style={{ ...ENTETE, fontSize: 16, marginTop: 2 }}>{page.horaire}</Text>}
      </View>

      {/* ── Le tableau, au modèle de son onglet ── */}
      <View
        style={{
          marginTop: 22,
          alignSelf: "center",
          width: largeurTableau,
          fontFamily: famille as unknown as string,
          fontSize: taille,
          borderTopWidth: 0.6,
          borderLeftWidth: 0.6,
          ...bordure,
        }}
      >
        {page.bandeau && pleineLargeur(page.bandeau, m.couleurs.bandeau, m.couleurs.texteEntete)}
        <View style={{ flexDirection: "row", borderBottomWidth: 0.6, ...bordure, backgroundColor: m.couleurs.fondEntete }}>
          {fusion?.position === "debut" && <View style={caseStyle(fusion.largeur)} />}
          {entetesFusionnes(page.colonnes).map((e, i) => (
            <View key={i} style={caseStyle(e.largeur, { backgroundColor: e.fond })}>
              {texte(e.entete, { fontWeight: 700, color: m.couleurs.texteEntete, textAlign: "center" })}
            </View>
          ))}
          {fusion?.position === "fin" && <View style={caseStyle(fusion.largeur)} />}
        </View>
        {page.blocs.map((b, i) => (
          <View key={i}>
            {b.titre && pleineLargeur(b.titre, m.couleurs.mois, m.couleurs.texteMois, true)}
            {fusion ? (
              <View style={{ flexDirection: "row" }}>
                {fusion.position === "debut" && caseFusion(b.fusion ?? "")}
                <View>{b.lignes.map(ligne)}</View>
                {fusion.position === "fin" && caseFusion(b.fusion ?? "")}
              </View>
            ) : (
              b.lignes.map(ligne)
            )}
          </View>
        ))}
      </View>
    </Page>
  );
}

export function PlanningModelePDF({ pages, logo, titre }: { pages: PageExport[]; logo: string; titre: string }) {
  return (
    <Document title={titre}>
      {pages.map((p, i) => (
        <PageModele key={i} page={p} logo={logo} />
      ))}
    </Document>
  );
}
