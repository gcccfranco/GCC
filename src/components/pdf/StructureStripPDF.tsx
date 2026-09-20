import { Text, View } from "@react-pdf/renderer";
import type { StripGroup } from "@/lib/pdf/compact";
import { nuanceDef, nuanceLabel } from "@/lib/setlist/nuances";
import { nuanceTextPdfColor, sectionPdfPalette } from "@/lib/pdf/colors";

// Bandeau de structure du PDF compact (lot 5, docs/spec-export-pdf.md) : la
// même chose que StructureStrip à l'écran — pastille abrégée aux couleurs de la
// section, « ×2 », tonalité de modulation, nuance en texte dessous (crescendo
// et decrescendo = flèche seule), notes et transitions numérotées en liste.
// Les polices sont enregistrées par SongPDF.tsx, qui importe ce composant.

const CJK = /[一-鿿㐀-䶿]/;
const fontOf = (text: string) => (CJK.test(text) ? "SourceHanSansCN" : "SpaceGrotesk");
const ARROW: Record<string, string> = { up: "↗", down: "↘" };

const PILL_H = 22;
const CONTENT_W = 495;

/** Hauteur approximative du bandeau (pt), pour réserver sa place au-dessus
 *  d'un scan 简谱 : largeur estimée de chaque étape, passage à la ligne,
 *  liste des notes. Volontairement large : un scan réduit vaut mieux qu'un
 *  scan renvoyé à la page suivante. */
export function estimateStripHeight(groups: StripGroup[], details: boolean): number {
  let rows = 1;
  let x = 0;
  let tallRow = false;
  let height = 0;
  for (const g of groups) {
    const pill = g.abbr.length * 8 + (g.repeat > 1 ? 14 : 0) + 14;
    const under = (g.step.nuance?.tags.join(" ").length ?? 0) * 5 + (g.step.nuance?.note?.length ?? 0) * 4.5;
    const w = Math.max(pill, under) + 10;
    if (x + w > CONTENT_W && x > 0) {
      height += PILL_H + (tallRow ? 14 : 0) + 8;
      rows++;
      x = 0;
      tallRow = false;
    }
    x += w;
    tallRow ||= Boolean(g.step.nuance || g.step.targetKey);
  }
  height += PILL_H + (tallRow ? 14 : 0);
  const notes = details ? groups.filter((g) => g.step.note || g.step.transition).length : 0;
  if (notes) height += 10 + notes * 13;
  return Math.ceil(height * 1.15) + 6 * rows;
}

function NumberBadge({ n }: { n: number }) {
  return (
    <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#1c1c1e",
                   alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 6.5, fontFamily: "LiberationSans", fontWeight: 700, color: "#ffffff" }}>{n}</Text>
    </View>
  );
}

export function StructureStripPDF({
  groups,
  songKey,
  details,
}: {
  groups: StripGroup[];
  /** Tonalité jouée : une « modulation » vers elle n'en est pas une. */
  songKey?: string;
  /** Notes et transitions numérotées sous le bandeau (le corps ne les porte pas). */
  details: boolean;
}) {
  const notes = details ? groups.filter((g) => g.step.note || g.step.transition) : [];
  const noteNumber = new Map(notes.map((g, i) => [g, i + 1]));
  return (
    <View style={{ marginTop: 8, marginBottom: 10 }} wrap={false}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", columnGap: 10, rowGap: 8 }}>
        {groups.map((g, i) => {
          const pal = sectionPdfPalette(g.step.section.type);
          const targetKey = g.step.targetKey && g.step.targetKey !== songKey ? g.step.targetKey : undefined;
          const n = noteNumber.get(g);
          const nuance = g.step.nuance;
          return (
            <View key={i} style={{ alignItems: "center" }}>
              <View style={{ position: "relative", height: PILL_H, minWidth: PILL_H, borderRadius: PILL_H / 2,
                             paddingHorizontal: 7, backgroundColor: pal.tint,
                             flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: pal.color, fontFamily: fontOf(g.abbr) }}>
                  {g.abbr}
                </Text>
                {g.repeat > 1 && (
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: pal.color, fontFamily: "SpaceGrotesk", marginLeft: 1 }}>
                    {`×${g.repeat}`}
                  </Text>
                )}
                {n !== undefined && (
                  <View style={{ position: "absolute", top: -3, right: -4 }}>
                    <NumberBadge n={n} />
                  </View>
                )}
              </View>
              {targetKey && (
                <Text style={{ marginTop: 2, fontSize: 7.5, color: "#6c6c72", fontFamily: "LiberationSans" }}>
                  {`→ ${targetKey}`}
                </Text>
              )}
              {nuance && (nuance.tags.length > 0 || nuance.note) && (
                <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", columnGap: 3 }}>
                  {nuance.tags.map((id) => {
                    const def = nuanceDef(id);
                    const { color, bold } = nuanceTextPdfColor(id);
                    return def?.trend ? (
                      <Text key={id} style={{ fontSize: 10, color, fontFamily: "DejaVuSans" }}>{ARROW[def.trend]}</Text>
                    ) : (
                      <Text key={id} style={{ fontSize: 8.5, color, fontFamily: "LiberationSans", fontWeight: bold ? 700 : 400 }}>
                        {nuanceLabel(id)}
                      </Text>
                    );
                  })}
                  {nuance.note ? (
                    <Text style={{ fontSize: 8, color: "#57534e", fontFamily: fontOf(nuance.note), fontWeight: 400 }}>
                      {nuance.note}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {notes.length > 0 && (
        <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: "#d0d8dd", rowGap: 4 }}>
          {notes.map((g, i) => {
            const text = [g.step.note, g.step.transition && `→ ${g.step.transition}`].filter(Boolean).join(" ");
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", columnGap: 5 }}>
                <NumberBadge n={i + 1} />
                <Text style={{ fontSize: 8.5, color: "#3a3a3c", fontFamily: fontOf(text), fontWeight: 400 }}>{text}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
