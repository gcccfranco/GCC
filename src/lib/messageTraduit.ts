import i18n from "i18next";

// Message d'erreur dans la langue de l'interface, pour les erreurs levées hors d'un composant
// (src/lib/**). La langue se lit sur <html lang> (posé par I18nProvider) : « zh-CN », sinon français.
export function messageTraduit(cle: string, repli?: string): string {
  const lang = typeof document !== "undefined" && document.documentElement.lang === "zh-CN" ? "zh-CN" : "fr";
  const t = i18n.getFixedT(lang);
  return t(cle, { defaultValue: repli ?? "" });
}
