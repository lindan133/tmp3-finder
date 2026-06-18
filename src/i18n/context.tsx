import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AppLanguage } from "../types";
import { en } from "./en";
import { ru } from "./ru";
import type { MessageCatalog, Translator } from "./types";

const catalogs: Record<AppLanguage, MessageCatalog> = { en, ru };

export function createTranslator(lang: AppLanguage): Translator {
  const messages = catalogs[lang] ?? en;

  const t = (
    key: keyof Omit<
      MessageCatalog,
      "modes" | "compactModes" | "placeholders" | "countLabels" | "voHints"
    >,
    params?: Record<string, string | number>
  ) => {
    let text = messages[key] as string;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  return {
    lang,
    messages,
    t,
    mode: (m) => messages.modes[m],
    compactMode: (m) => messages.compactModes[m],
    placeholder: (m) => messages.placeholders[m],
    countLabel: (m) => messages.countLabels[m],
    voHint: (key) => messages.voHints[key],
  };
}

const I18nContext = createContext<Translator>(createTranslator("en"));

export function I18nProvider({
  language,
  children,
}: {
  language: AppLanguage;
  children: ReactNode;
}) {
  const value = useMemo(() => createTranslator(language), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
