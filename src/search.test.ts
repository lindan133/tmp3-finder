import { describe, expect, it } from "vitest";
import type { GameData } from "./types";
import {
  findSuggestedMode,
  getMatchConfidence,
  isExactMatch,
  MAX_SEARCH_RESULTS,
  normalize,
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
    {
      id: "t2",
      question: "What color is the ocean?",
      choices: [
        { text: "Blue", correct: true },
        { text: "Red", correct: false },
      ],
    },
    {
      id: "t3",
      question: "What color is grass?",
      choices: [
        { text: "Green", correct: true },
        { text: "Blue", correct: false },
      ],
    },
    {
      id: "t4",
      question: "What color is the sun?",
      choices: [
        { text: "Yellow", correct: true },
        { text: "Purple", correct: false },
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
  counts: { trivia: 4, finalRound: 1, subjective: 0, vo: 0 },
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
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.correctAnswer).toBe("Blue");
  });

  it("returns up to three trivia matches", () => {
    const results = searchTrivia(mockData, "color");
    expect(results.length).toBeGreaterThan(1);
    expect(results.length).toBeLessThanOrEqual(MAX_SEARCH_RESULTS);
  });

  it("finds final round by category", () => {
    const results = searchFinalRound(mockData, "Scientists");
    expect(results).toHaveLength(1);
    expect(results[0]?.correctAnswers).toContain("Einstein");
  });

  it("sorts final round correct answers alphabetically", () => {
    const data: GameData = {
      ...mockData,
      finalRound: [
        {
          id: "f2",
          categoryName: "Eaten By The Very Hungry Caterpillar",
          choices: [
            { text: "cherry pie", correct: true },
            { text: "apple", correct: true },
            { text: "watermelon", correct: true },
            { text: "pickle", correct: false },
          ],
        },
      ],
    };
    const results = searchFinalRound(data, "Eaten");
    expect(results[0]?.correctAnswers).toEqual([
      "apple",
      "cherry pie",
      "watermelon",
    ]);
  });

  it("filters final round to matching items when searching an answer", () => {
    const data: GameData = {
      ...mockData,
      finalRound: [
        {
          id: "f2",
          categoryName: "Eaten By The Very Hungry Caterpillar",
          choices: [
            { text: "cherry pie", correct: true },
            { text: "apple", correct: true },
            { text: "watermelon", correct: true },
          ],
        },
      ],
    };
    const results = searchFinalRound(data, "apple");
    expect(results[0]?.correctAnswers).toEqual(["apple"]);
    expect(results[0]?.isItemSearch).toBe(true);
    expect(results[0]?.matchedAnswers).toEqual(["apple"]);
  });

  it("filters trivia by difficulty", () => {
    const data: GameData = {
      ...mockData,
      trivia: [
        {
          id: "easy-1",
          question: "Easy question about cats",
          difficulty: "Easy",
          choices: [{ text: "meow", correct: true }],
        },
        {
          id: "hard-1",
          question: "Hard question about cats",
          difficulty: "Hard",
          choices: [{ text: "felis", correct: true }],
        },
      ],
    };
    const easyOnly = searchTrivia(data, "cats", MAX_SEARCH_RESULTS, {
      triviaDifficulty: "easy",
    });
    expect(easyOnly).toHaveLength(1);
    expect(easyOnly[0]?.question.id).toBe("easy-1");
  });

  it("prioritizes multi-word queries when all tokens match", () => {
    const data: GameData = {
      ...mockData,
      trivia: [
        {
          id: "capital-france",
          question: "What is the capital of France?",
          choices: [{ text: "Paris", correct: true }],
        },
        {
          id: "capital-germany",
          question: "What is the capital of Germany?",
          choices: [{ text: "Berlin", correct: true }],
        },
      ],
    };
    const results = searchTrivia(data, "capital france");
    expect(results[0]?.question.id).toBe("capital-france");
  });

  it("detects exact trivia match", () => {
    const results = searchTrivia(mockData, "Blue");
    expect(results[0]).toBeTruthy();
    expect(isExactMatch(results[0]!)).toBe(true);
  });

  it("reports match confidence", () => {
    const results = searchTrivia(mockData, "Blue");
    expect(results[0]).toBeTruthy();
    expect(getMatchConfidence(results[0]!)).toBeGreaterThan(80);
  });

  it("reports 100% for exact final round category match", () => {
    const data: GameData = {
      ...mockData,
      finalRound: [
        {
          id: "f-shake",
          categoryName: "Shakespearean Tragedies",
          choices: [{ text: "Hamlet", correct: true }],
        },
      ],
    };
    const results = searchFinalRound(data, "Shakespearean Tragedies");
    expect(results[0]).toBeTruthy();
    expect(isExactMatch(results[0]!)).toBe(true);
    expect(getMatchConfidence(results[0]!)).toBe(100);
  });

  it("finds trivia by long partial question text", () => {
    const data: GameData = {
      ...mockData,
      trivia: [
        {
          id: "t-iron",
          question:
            "In the Ironman Triathlon, after you swim but before you run, how far do you bike?",
          choices: [
            { text: "26.2 miles", correct: false },
            { text: "112 miles", correct: true },
          ],
        },
      ],
    };
    const query = ", after you swim but before you run, how far do you bi";
    const results = searchTrivia(data, query);
    expect(results).toHaveLength(1);
    expect(results[0]?.correctAnswer).toBe("112 miles");
    expect(results[0]?.question.id).toBe("t-iron");
  });

  it("does not return false positives for long partial questions", () => {
    const data: GameData = {
      ...mockData,
      trivia: [
        {
          id: "t-iron",
          question:
            "In the Ironman Triathlon, after you swim but before you run, how far do you bike?",
          choices: [{ text: "112 miles", correct: true }],
        },
        {
          id: "t-squirrels",
          question: "Squirrels! What can't they do?",
          choices: [{ text: "vomit", correct: true }],
        },
      ],
    };
    const query = ", after you swim but before you run, how far do you bi";
    const results = searchTrivia(data, query);
    expect(results).toHaveLength(1);
    expect(results[0]?.question.id).toBe("t-iron");
  });

  it("suggests trivia mode for question text in final round", () => {
    const data: GameData = {
      ...mockData,
      trivia: [
        {
          id: "t-iron",
          question:
            "In the Ironman Triathlon, after you swim but before you run, how far do you bike?",
          choices: [{ text: "112 miles", correct: true }],
        },
      ],
      finalRound: [
        {
          id: "f-non",
          categoryName: "Nonmetals on the Periodic Table",
          choices: [{ text: "argon", correct: true }],
        },
      ],
    };
    const query = ", after you swim but before you run, how far do you bi";
    expect(searchFinalRound(data, query)).toHaveLength(0);
    const hint = findSuggestedMode(data, query, "finalRound");
    expect(hint?.mode).toBe("trivia");
    expect(hint?.confidence).toBeGreaterThan(35);
  });

  it("does not return junk final round matches for trivia text", () => {
    const data: GameData = {
      ...mockData,
      finalRound: [
        {
          id: "f-non",
          categoryName: "Nonmetals on the Periodic Table",
          choices: [
            { text: "argon", correct: true },
            { text: "carbon", correct: true },
            { text: "gold", correct: false },
          ],
        },
      ],
    };
    const query = ", after you swim but before you run, how far do you bi";
    const results = searchFinalRound(data, query);
    expect(results).toHaveLength(0);
  });
});
