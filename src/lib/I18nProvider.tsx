"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
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

type Language = "fr" | "zh-CN";

// Une instance par langue, choisie par un état React — jamais en changeant la
// langue de l'instance globale. Le serveur rend en français ; une partie sous
// <Suspense> (connexion, page du chant) s'hydrate après la racine. Si la
// langue globale avait déjà basculé, elle rendrait du chinois sur du HTML
// français (« Hydration failed »). Un changement de contexte, lui, attend que
// React ait hydraté ces parties avec l'ancienne valeur. Les instances partagent
// les traductions (cloneInstance).
const instances: Record<Language, typeof i18n> = {
  fr: i18n,
  "zh-CN": i18n.cloneInstance({ lng: "zh-CN" }),
};

const SetLanguageContext = createContext<(lng: Language) => void>(() => {});

/** Change la langue de l'interface et la retient sur l'appareil. */
export function useSetLanguage() {
  return useContext(SetLanguageContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("i18nextLng");
    const systemLanguage = navigator.language.startsWith("zh") ? "zh-CN" : "fr";
    const clientLanguage = savedLanguage || systemLanguage;
    if (clientLanguage === "zh-CN") setLanguageState("zh-CN");
  }, []);

  // Tient l'attribut lang du <html> synchronisé avec la langue active :
  // accessibilité (lecteurs d'écran) et choix des glyphes han par le navigateur.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lng: Language) => {
    setLanguageState(lng);
    try { localStorage.setItem("i18nextLng", lng); } catch { /* stockage indisponible */ }
  }, []);

  return (
    <SetLanguageContext.Provider value={setLanguage}>
      <I18nextProvider i18n={instances[language]}>{children}</I18nextProvider>
    </SetLanguageContext.Provider>
  );
}
export default i18n;
