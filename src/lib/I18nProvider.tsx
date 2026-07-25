"use client";

import { useEffect } from "react";
import { initReactI18next } from "react-i18next";
import i18n from "i18next";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: frTranslations },
        "zh-CN": { translation: zhTranslations },
      },
      lng: "fr", // Statically compiled server-side HTML will be in French
      fallbackLng: "fr",
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedLanguage = localStorage.getItem("i18nextLng");
    const systemLanguage = navigator.language.startsWith("zh") ? "zh-CN" : "fr";
    const clientLanguage = savedLanguage || systemLanguage;
    if (clientLanguage && clientLanguage !== i18n.language) {
      i18n.changeLanguage(clientLanguage);
    }
  }, []);

  // Tient l'attribut lang du <html> synchronisé avec la langue active :
  // accessibilité (lecteurs d'écran) et choix des glyphes han par le navigateur.
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng === "zh-CN" ? "zh-CN" : "fr";
    };
    apply(i18n.language);
    i18n.on("languageChanged", apply);
    return () => { i18n.off("languageChanged", apply); };
  }, []);

  return <>{children}</>;
}
export default i18n;
