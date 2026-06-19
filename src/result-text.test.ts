import { describe, expect, it } from "vitest";
import type { SearchResult } from "./types";
import { getResultCopyText } from "./result-text";

const finalRoundItem: SearchResult = {
  type: "finalRound",
  question: {
    id: "f1",
    categoryName: "Fruits",
    choices: [{ text: "apple", correct: true }],
  },
  correctAnswers: ["apple"],
  matchedAnswers: ["apple"],
  isItemSearch: true,
  wrongAnswers: [],
  score: 5000,
};

describe("getResultCopyText", () => {
  it("copies a single final round item when searching by answer", () => {
    expect(getResultCopyText(finalRoundItem)).toBe("apple");
  });

  it("copies question and answer when configured", () => {
    const trivia: SearchResult = {
      type: "trivia",
      question: {
        id: "t1",
        question: "Sky color?",
        choices: [{ text: "Blue", correct: true }],
      },
      correctAnswer: "Blue",
      score: 1000,
    };
    expect(
      getResultCopyText(trivia, { copyFormat: "questionAndAnswer" })
    ).toBe("Sky color?\nBlue");
  });
});
