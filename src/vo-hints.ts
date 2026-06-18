import type { AppLanguage } from "./types";
import type { MessageCatalog } from "./i18n/types";
import { createTranslator } from "./i18n/context";

export function getVoHint(
  name: string,
  voHints: MessageCatalog["voHints"]
): string | null {
  const n = name.toUpperCase();

  if (n.includes("SUBJECTIVE")) return voHints.subjective;
  if (
    n.includes("FINAL_ROUND") ||
    n.includes("FINALROUND") ||
    n === "FINAL_ROUND_INTRO"
  ) {
    return voHints.finalRound;
  }
  if (n.includes("FIRST_QUESTION") || n === "QUESTION_INTRO") {
    return voHints.firstQuestion;
  }
  if (n.includes("HARD_QUESTION")) return voHints.hardQuestion;
  if (n.includes("FINAL_ROUND") || n.includes("GROUPING")) {
    return voHints.grouping;
  }
  if (n === "TMP3_WELCOME" || n.includes("INTRO_SETUP")) {
    return voHints.welcome;
  }
  if (n.includes("KILLING_FLOOR")) return voHints.killingFloor;

  return null;
}

export function getVoHintLocalized(
  name: string,
  language: AppLanguage
): string | null {
  const { messages } = createTranslator(language);
  return getVoHint(name, messages.voHints);
}
