/** Un idéogramme chinois (CJK unifiés et extension A) : sert au rendu colonne par colonne et au pinyin. */
export function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}
