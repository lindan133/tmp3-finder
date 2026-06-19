import { stripMarkup } from "./search";
import type { CopyFormat, SearchResult } from "./types";

export interface CopyOptions {
  copyFormat?: CopyFormat;
  voCopyFullLine?: boolean;
}

const DEFAULT_OPTIONS: Required<CopyOptions> = {
  copyFormat: "answerOnly",
  voCopyFullLine: true,
};

export function getResultCopyText(
  result: SearchResult,
  options?: CopyOptions
): string | null {
  const prefs = { ...DEFAULT_OPTIONS, ...options };

  switch (result.type) {
    case "trivia": {
      if (prefs.copyFormat === "questionAndAnswer") {
        const question = stripMarkup(result.question.question);
        return `${question}\n${result.correctAnswer}`;
      }
      return result.matchedChoice ?? result.correctAnswer;
    }
    case "finalRound": {
      if (result.isItemSearch) {
        return result.matchedAnswers[0] ?? result.correctAnswers[0] ?? null;
      }
      return result.correctAnswers.join(", ");
    }
    case "subjective":
      return result.matchedChoice ?? result.choices[0] ?? null;
    case "vo": {
      if (prefs.voCopyFullLine) {
        return result.matchedSubtitle ?? result.subtitles[0] ?? null;
      }
      return result.entry.name.replace(/_/g, " ");
    }
  }
}
