"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Lang } from "./exerciseLabels";

// Idioma de los nombres de ejercicio y etiquetas. Se guarda en el navegador (no en la base).
const STORAGE_KEY = "ub_lang";

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType>({ lang: "es", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  // Castellano por defecto; se lee la preferencia guardada tras montar para no romper el render del servidor
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextType {
  return useContext(LangContext);
}
