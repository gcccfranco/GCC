// Le rendu accords-au-dessus-des-paroles découpe chaque ligne en spans
// inline-flex : le navigateur insère alors un saut de ligne entre chaque
// syllabe/caractère lors d'un copier-coller. Ce handler reconstruit un texte
// propre : les éléments marqués data-copy-ignore (accords, pinyin, jianpu)
// sont exclus, et chaque élément data-copy-line produit une seule ligne —
// suivie de sa ligne de pinyin (data-copy-pinyin), même masquée à l'écran.
//
// Il écoute le document entier : un onCopy posé sur le chant ne se déclenche
// que si la sélection y **commence**. Dans une setlist, elle part souvent du
// numéro du chant, hors du chant ; la copie native partait alors, en HTML mis
// en page que PowerPoint et Canva collent d'un bloc.

import type { ChordProSection } from "@/types/chordPro";

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "LI"]);

/** Paroles d'un chant pour la régie (bouton « Copier les paroles ») : les
 *  sections dans l'ordre donné, reprises comprises, une ligne vide entre deux
 *  sections, sans accords ni noms de section ; en chinois, chaque ligne suivie
 *  de son pinyin. Lu dans le chant et non à l'écran : marche aussi quand le
 *  scan 简谱 remplace les paroles. */
export function lyricsText(sections: ChordProSection[]): string {
  return sections
    .map((section) =>
      section.lines
        .map((line) => {
          const lyric = line.tokens
            .filter((t) => t.type === "lyric")
            .map((t) => t.value)
            .join("")
            .replace(/\s+/g, " ")
            .trim();
          const pinyin = line.pinyin?.trim().split(/\s+/).join(" ");
          return lyric && pinyin ? `${lyric}\n${pinyin}` : lyric;
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

function nodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el.hasAttribute("data-copy-ignore")) return "";
  let out = "";
  for (const child of Array.from(el.childNodes)) out += nodeText(child);
  if (el.hasAttribute("data-copy-line")) {
    const pinyin = el.getAttribute("data-copy-pinyin")?.trim().split(/\s+/).join(" ");
    return out.replace(/\u00a0/g, " ").replace(/\s+$/, "") + "\n" + (pinyin ? pinyin + "\n" : "");
  }
  if (BLOCK_TAGS.has(el.tagName) && out.trim() && !out.endsWith("\n")) out += "\n";
  return out;
}

/** Vrai si une des plages sélectionnées touche une ligne de chant. */
function touchesLyrics(sel: Selection): boolean {
  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    const node = range.commonAncestorContainer;
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) continue;
    if (el.closest("[data-copy-line]")) return true;
    for (const line of el.querySelectorAll("[data-copy-line]")) {
      if (range.intersectsNode(line)) return true;
    }
  }
  return false;
}

export function handleLyricsCopy(e: ClipboardEvent) {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !e.clipboardData) return;
  if (!touchesLyrics(sel)) return;
  const container = document.createElement("div");
  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    // Sélection à l'intérieur d'une seule ligne : cloneContents perd la ligne
    // elle-même, donc son pinyin. On la ré-enveloppe dans une copie vide.
    const node = range.commonAncestorContainer;
    const line = (node instanceof Element ? node : node.parentElement)?.closest("[data-copy-line]");
    const target = line ? container.appendChild(line.cloneNode(false)) : container;
    target.appendChild(range.cloneContents());
  }
  const text = nodeText(container)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "");
  if (!text) return;
  e.clipboardData.setData("text/plain", text);
  e.preventDefault();
}
