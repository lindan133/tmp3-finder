import type { SearchResult } from "./types";

export function getResultCopyText(result: SearchResult): string | null {
  switch (result.type) {
    case "trivia":
      return result.correctAnswer;
    case "finalRound":
      return result.correctAnswers.join(", ");
    case "subjective":
      return result.choices[0] ?? null;
    case "vo":
      return result.matchedSubtitle ?? result.subtitles[0] ?? null;
  }
}
