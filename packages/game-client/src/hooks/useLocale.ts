import { useCallback, useState } from "react";
import { getLanguage, setLanguage, t, type Language } from "../i18n/index.js";

export function useLocale() {
  const [, tick] = useState(0);

  const changeLanguage = useCallback((lang: Language) => {
    if (getLanguage() === lang) return;
    setLanguage(lang);
    tick((n) => n + 1);
  }, []);

  return {
    strings: t(),
    language: getLanguage(),
    setLanguage: changeLanguage,
  };
}
