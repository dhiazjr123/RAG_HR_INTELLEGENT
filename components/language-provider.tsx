"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getStoredLanguage,
  getTranslation,
  SETTINGS_SAVED_EVENT,
  type Locale,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Locale;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Locale>("id");

  const loadLanguage = useCallback(() => {
    setLanguage(getStoredLanguage());
  }, []);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "en" ? "en" : "id";
    }
  }, [language]);

  useEffect(() => {
    const handler = () => loadLanguage();
    window.addEventListener(SETTINGS_SAVED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_SAVED_EVENT, handler);
  }, [loadLanguage]);

  const t = useCallback(
    (key: string) => getTranslation(language, key),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "id",
      t: (key: string) => getTranslation("id", key),
    };
  }
  return ctx;
}
