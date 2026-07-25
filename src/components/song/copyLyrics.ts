import type { ClipboardEvent } from "react";

// Le rendu accords-au-dessus-des-paroles découpe chaque ligne en spans
// inline-flex : le navigateur insère alors un saut de ligne entre chaque
// syllabe/caractère lors d'un copier-coller. Ce handler reconstruit un texte
// propre : les éléments marqués data-copy-ignore (accords, pinyin, jianpu)
// sont exclus, et chaque élément data-copy-line produit une seule ligne.

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "LI"]);

function nodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el.hasAttribute("data-copy-ignore")) return "";
  let out = "";
  for (const child of Array.from(el.childNodes)) out += nodeText(child);
  if (el.hasAttribute("data-copy-line")) {
    return out.replace(/\u00a0/g, " ").replace(/\s+$/, "") + "\n";
  }
  if (BLOCK_TAGS.has(el.tagName) && out.trim() && !out.endsWith("\n")) out += "\n";
  return out;
}

export function handleLyricsCopy(e: ClipboardEvent) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const container = document.createElement("div");
  for (let i = 0; i < sel.rangeCount; i++) {
    container.appendChild(sel.getRangeAt(i).cloneContents());
  }
  const text = nodeText(container)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "");
  if (!text) return;
  e.clipboardData.setData("text/plain", text);
  e.preventDefault();
}
