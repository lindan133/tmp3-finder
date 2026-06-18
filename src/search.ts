import type { AutoSearchResult, GameData, SearchResult, VoEntry } from "./types";

export function stripMarkup(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\[i\]/gi, "").replace(/\[\/i\]/gi, "").trim();
}

export function normalize(text: string | undefined | null): string {
  return stripMarkup(text)
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,.;:!?\-–—/\\()[\]{}]+/)
    .filter((t) => t.length > 1);
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "by", "to", "of", "or", "and",
  "is", "it", "be", "as", "for",
]);

function meaningfulTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t));
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

function tokensMatchFuzzy(queryToken: string, targetToken: string): boolean {
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }
  if (queryToken.length < 4) return false;
  return levenshtein(queryToken, targetToken) <= 1;
}

function scoreMatch(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;

  if (t === q) return 1000;
  if (t.includes(q)) return 800 + (q.length / t.length) * 100;
  if (q.includes(t)) return 750 + (t.length / q.length) * 100;

  const queryTokens = tokenize(q);
  const targetTokens = tokenize(t);
  if (queryTokens.length === 0) return 0;

  let matched = 0;
  for (const qt of queryTokens) {
    if (targetTokens.some((tt) => tokensMatchFuzzy(qt, tt))) {
      matched++;
    }
  }

  const ratio = matched / queryTokens.length;
  if (ratio < 0.4) return 0;

  return ratio * 500 + matched * 20;
}

function scoreCategoryMatch(query: string, categoryName: string): number {
  const q = normalize(query);
  const cat = normalize(categoryName);
  if (!q || !cat) return 0;

  if (cat === q) return 10000;
  if (cat.includes(q)) return 9000 + (q.length / cat.length) * 500;
  if (q.includes(cat)) return 8500 + (cat.length / q.length) * 500;

  const queryTokens = meaningfulTokens(q);
  const categoryTokens = meaningfulTokens(cat);
  if (queryTokens.length === 0 || categoryTokens.length === 0) return 0;

  let matched = 0;
  for (const qt of queryTokens) {
    if (categoryTokens.some((ct) => tokensMatchFuzzy(qt, ct))) {
      matched++;
    }
  }

  const ratio = matched / queryTokens.length;
  if (ratio < 0.6) return 0;

  return ratio * 2000 + matched * 100;
}

function scoreChoiceMatch(
  query: string,
  choices: { text: string; correct?: boolean }[]
): number {
  let best = 0;

  for (const choice of choices) {
    const text = stripMarkup(choice.text);
    const q = normalize(query);
    const t = normalize(text);
    if (!q || !t) continue;

    let score = 0;
    if (t === q) score = 5000;
    else if (t.includes(q)) score = 4000 + (q.length / t.length) * 300;
    else if (q.includes(t)) score = 3500 + (t.length / q.length) * 300;
    else score = scoreMatch(query, text);

    if (!choice.correct) score *= 0.2;
    best = Math.max(best, score);
  }

  return best;
}

const STRONG_CATEGORY_SCORE = 1500;
const STRONG_QUESTION_SCORE = 400;

function pickBest<T extends { score: number }>(items: T[]): T[] {
  const best = items.sort((a, b) => b.score - a.score)[0];
  return best ? [best] : [];
}

export function searchTrivia(data: GameData, query: string) {
  if (!query.trim()) return [];

  const ranked = data.trivia.map((question) => {
    const questionScore = scoreMatch(query, question.question);
    const choiceScore = scoreChoiceMatch(query, question.choices);
    const correct = question.choices.find((c) => c.correct);

    return {
      type: "trivia" as const,
      question,
      correctAnswer: correct ? stripMarkup(correct.text) : "—",
      questionScore,
      choiceScore,
      score: Math.max(questionScore, choiceScore),
    };
  });

  const bestQuestion = ranked
    .filter((r) => r.questionScore >= STRONG_QUESTION_SCORE)
    .sort((a, b) => b.questionScore - a.questionScore)[0];

  if (bestQuestion) {
    return [{ ...bestQuestion, score: bestQuestion.questionScore }];
  }

  const bestChoice = ranked
    .filter((r) => r.choiceScore > 0)
    .sort((a, b) => b.choiceScore - a.choiceScore)[0];

  if (bestChoice) {
    return [{ ...bestChoice, score: bestChoice.choiceScore }];
  }

  return [];
}

export function searchFinalRound(data: GameData, query: string) {
  if (!query.trim()) return [];

  const ranked = data.finalRound.map((question) => {
    const categoryScore = scoreCategoryMatch(query, question.categoryName);
    const choiceScore = scoreChoiceMatch(query, question.choices);

    const correctAnswers = question.choices
      .filter((c) => c.correct)
      .map((c) => stripMarkup(c.text));
    const wrongAnswers = question.choices
      .filter((c) => !c.correct)
      .map((c) => stripMarkup(c.text));

    return {
      type: "finalRound" as const,
      question,
      correctAnswers,
      wrongAnswers,
      categoryScore,
      choiceScore,
    };
  });

  const bestCategory = ranked
    .filter((r) => r.categoryScore >= STRONG_CATEGORY_SCORE)
    .sort((a, b) => b.categoryScore - a.categoryScore)[0];

  if (bestCategory) {
    return [{ ...bestCategory, score: bestCategory.categoryScore }];
  }

  const bestChoice = ranked
    .filter((r) => r.choiceScore > 0)
    .sort((a, b) => b.choiceScore - a.choiceScore)[0];

  if (bestChoice) {
    return [{ ...bestChoice, score: bestChoice.choiceScore }];
  }

  return [];
}

export function searchSubjective(data: GameData, query: string) {
  if (!query.trim()) return [];

  const ranked = data.subjective.map((question) => {
    const questionScore = scoreMatch(query, question.question);
    const choiceScore = scoreChoiceMatch(
      query,
      question.choices.map((c) => ({ ...c, correct: true }))
    );
    const introScores =
      question.intro?.versions
        .filter((v) => v.subtitle)
        .map((v) => scoreMatch(query, v.subtitle)) ?? [];
    const introScore = Math.max(0, ...introScores);

    const introLines =
      question.intro?.versions
        .map((v) => v.subtitle)
        .filter((s): s is string => Boolean(s)) ?? [];

    return {
      type: "subjective" as const,
      question,
      choices: question.choices.map((c) => stripMarkup(c.text)),
      introLines,
      questionScore,
      choiceScore,
      introScore,
      score: Math.max(questionScore, choiceScore, introScore),
    };
  });

  const bestQuestion = ranked
    .filter((r) => r.questionScore >= STRONG_QUESTION_SCORE)
    .sort((a, b) => b.questionScore - a.questionScore)[0];

  if (bestQuestion) {
    return [{ ...bestQuestion, score: bestQuestion.questionScore }];
  }

  const bestOther = ranked
    .filter((r) => Math.max(r.choiceScore, r.introScore) > 0)
    .sort(
      (a, b) =>
        Math.max(b.choiceScore, b.introScore) -
        Math.max(a.choiceScore, a.introScore)
    )[0];

  if (bestOther) {
    return [
      {
        ...bestOther,
        score: Math.max(bestOther.choiceScore, bestOther.introScore),
      },
    ];
  }

  return [];
}

function getVoVersions(entry: VoEntry) {
  return entry.audio?.versions ?? [];
}

function scoreVoEntry(
  query: string,
  entry: VoEntry
): { score: number; matchedSubtitle?: string } {
  const q = normalize(query);
  const name = normalize(entry.name);
  const nameSpaced = name.replace(/_/g, " ");

  if (name === q || nameSpaced === q) {
    return { score: 10000 };
  }
  if (name.includes(q) || nameSpaced.includes(q)) {
    return { score: 9000 + (q.length / nameSpaced.length) * 500 };
  }

  let bestSubtitleScore = 0;
  let matchedSubtitle: string | undefined;

  for (const version of getVoVersions(entry)) {
    const sub = version.subtitle;
    if (!sub) continue;
    const s = scoreMatch(query, sub);
    if (s > bestSubtitleScore) {
      bestSubtitleScore = s;
      matchedSubtitle = sub;
    }
  }

  const nameScore = scoreMatch(query, nameSpaced);
  const score = Math.max(nameScore * 1.2, bestSubtitleScore);

  return score > 0 ? { score, matchedSubtitle } : { score: 0 };
}

export function searchVo(data: GameData, query: string) {
  if (!query.trim()) return [];

  const ranked = data.vo
    .map((entry) => {
      const { score, matchedSubtitle } = scoreVoEntry(query, entry);
      const subtitles = getVoVersions(entry)
        .map((v) => v.subtitle)
        .filter((s): s is string => Boolean(s));

      return {
        type: "vo" as const,
        entry,
        subtitles,
        matchedSubtitle,
        score,
      };
    })
    .filter((r) => r.score > 0);

  return pickBest(ranked);
}

export function isExactMatch(result: SearchResult): boolean {
  switch (result.type) {
    case "trivia":
    case "subjective":
      return result.score >= 800;
    case "finalRound":
    case "vo":
      return result.score >= 8500;
  }
}

export function searchAuto(
  data: GameData,
  query: string
): AutoSearchResult | null {
  if (!query.trim()) return null;

  const candidates: AutoSearchResult[] = [];

  for (const result of searchTrivia(data, query)) {
    candidates.push({ mode: "trivia", result, exact: isExactMatch(result) });
  }
  for (const result of searchFinalRound(data, query)) {
    candidates.push({ mode: "finalRound", result, exact: isExactMatch(result) });
  }
  for (const result of searchSubjective(data, query)) {
    candidates.push({ mode: "subjective", result, exact: isExactMatch(result) });
  }
  for (const result of searchVo(data, query)) {
    candidates.push({ mode: "vo", result, exact: isExactMatch(result) });
  }

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => b.result.score - a.result.score)[0];
}
