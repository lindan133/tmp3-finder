import { describe, expect, it } from "vitest";
import type { GameData } from "./types";
import {
  isExactMatch,
  normalize,
  searchAuto,
  searchFinalRound,
  searchTrivia,
  stripMarkup,
} from "./search";

const mockData: GameData = {
  trivia: [
    {
      id: "t1",
      question: "What color is the sky?",
      choices: [
        { text: "Green", correct: false },
        { text: "Blue", correct: true },
      ],
    },
  ],
  finalRound: [
    {
      id: "f1",
      categoryName: "Famous Scientists",
      choices: [
        { text: "Einstein", correct: true },
        { text: "Newton", correct: true },
        { text: "Shakespeare", correct: false },
      ],
    },
  ],
  subjective: [],
  vo: [],
  counts: { trivia: 1, finalRound: 1, subjective: 0, vo: 0 },
  loadInfo: {
    files: {
      trivia: true,
      finalRound: true,
      subjective: false,
      vo: false,
    },
    warnings: [],
    loadedAt: "2026-01-01T00:00:00.000Z",
    edition: "demo",
  },
};

describe("search helpers", () => {
  it("strips markup", () => {
    expect(stripMarkup("[i]Hello[/i]")).toBe("Hello");
  });

  it("normalizes text", () => {
    expect(normalize("  Hello   World  ")).toBe("hello world");
  });
});

describe("search modes", () => {
  it("finds trivia by answer", () => {
    const results = searchTrivia(mockData, "Blue");
    expect(results).toHaveLength(1);
    expect(results[0]?.correctAnswer).toBe("Blue");
  });

  it("finds final round by category", () => {
    const results = searchFinalRound(mockData, "Scientists");
    expect(results).toHaveLength(1);
    expect(results[0]?.correctAnswers).toContain("Einstein");
  });

  it("auto mode picks the best match", () => {
    const result = searchAuto(mockData, "Blue");
    expect(result?.mode).toBe("trivia");
    expect(result?.result.type).toBe("trivia");
  });

  it("detects exact trivia match", () => {
    const results = searchTrivia(mockData, "Blue");
    expect(results[0]).toBeTruthy();
    expect(isExactMatch(results[0]!)).toBe(true);
  });
});
