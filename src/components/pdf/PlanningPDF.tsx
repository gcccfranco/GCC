import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// PDF d'une grille de planning (lot 17, G4 : « pouvoir les exporter en CSV ou
// en PDF », Timothée, 19/09/2026). Une page A4 en paysage, l'en-tête à la
// couleur du planning, une ligne par dimanche, un séparateur par mois — la
// grille de l'écran, telle quelle. Composant pur : les libellés arrivent déjà
// traduits, comme pour SongPDF.

Font.register({
  family: "LiberationSans",
  fonts: [
    { src: "/fonts/LiberationSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/LiberationSans-Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "SourceHanSansCN",
  fonts: [{ src: "/fonts/SourceHanSansCN-Light.ttf", fontWeight: 300 }],
});

export type PlanningPDFProps = {
  titre: string;
  sousTitre: string;
  couleur: string;
  /** Libellés des colonnes, la date en premier. */
  entetes: string[];
  /** Lignes : la date déjà mise en forme (« dim. 04 oct. »), puis les cases. */
  lignes: { cells: string[]; mois?: string }[];
  lang: string;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: "#1c1c1e" },
  titre: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  sousTitre: { fontSize: 9.5, color: "#6c6c72", marginBottom: 12 },
  ligne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dcdce0" },
  entete: { flexDirection: "row", color: "#ffffff", fontWeight: 700 },
  cellule: { paddingVertical: 4, paddingHorizontal: 5, flexGrow: 1, flexBasis: 0 },
  date: { paddingVertical: 4, paddingHorizontal: 5, width: 74, fontWeight: 700 },
  mois: { paddingVertical: 3, paddingHorizontal: 5, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 },
});

export function PlanningPDF({ titre, sousTitre, couleur, entetes, lignes, lang }: PlanningPDFProps) {
  const fontFamily = lang === "zh-CN" ? "SourceHanSansCN" : "LiberationSans";
  const [enteteDate, ...enteteCases] = entetes;
  return (
    <Document title={titre}>
      <Page size="A4" orientation="landscape" style={{ ...styles.page, fontFamily }}>
        <Text style={styles.titre}>{titre}</Text>
        <Text style={styles.sousTitre}>{sousTitre}</Text>
        <View style={{ ...styles.entete, backgroundColor: couleur }} fixed>
          <Text style={styles.date}>{enteteDate}</Text>
          {enteteCases.map((e, i) => (
            <Text key={i} style={styles.cellule}>{e}</Text>
          ))}
        </View>
        {lignes.map((l, i) => (
          <View key={i} wrap={false}>
            {l.mois && (
              <View style={{ backgroundColor: `${couleur}22` }}>
                <Text style={{ ...styles.mois, color: couleur }}>{l.mois}</Text>
              </View>
            )}
            <View style={{ ...styles.ligne, backgroundColor: i % 2 ? "#f7f7f5" : "#ffffff" }}>
              <Text style={{ ...styles.date, color: couleur }}>{l.cells[0]}</Text>
              {l.cells.slice(1).map((c, j) => (
                <Text key={j} style={styles.cellule}>{c || "—"}</Text>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
