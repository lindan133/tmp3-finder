import type { GameData, QuestionMode, SearchResult, VoEntry } from "./types";

export const MAX_SEARCH_RESULTS = 3;
const MIN_MATCH_SCORE = 280;
const MIN_FINAL_ROUND_SCORE = 500;
const MIN_CONFIDENCE = 18;
const STRONG_CATEGORY_SCORE = 1500;
const FINAL_ITEM_MATCH_SCORE = 120;

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "by", "to", "of", "or", "and",
  "is", "it", "be", "as", "for", "you", "your", "how", "what", "which",
  "when", "where", "who", "why", "can", "cant", "could", "would", "should",
  "their", "they", "them", "this", "that", "these", "those", "but", "before",
  "after", "far", "do", "does", "did",
]);

const RU_STOP_WORDS = new Set([
  "и", "в", "во", "на", "с", "со", "к", "ко", "от", "о", "об", "по", "для",
  "что", "как", "не", "это", "из", "за", "до", "при", "или", "но", "а", "же",
  "ли", "бы", "то", "все", "у", "ещё", "еще", "от", "ни", "нет", "да",
]);

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

function meaningfulTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t) && !RU_STOP_WORDS.has(t));
}

export function sortAlphabetically(items: string[]): string[] {
  return [...items].sort((a, b) =>
    normalize(a).localeCompare(normalize(b), "en", { sensitivity: "base" })
  );
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
  if (queryToken === targetToken) return true;
  if (queryToken.length < 3 || targetToken.length < 3) return false;

  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }

  if (queryToken.length < 4 || targetToken.length < 4) return false;
  return levenshtein(queryToken, targetToken) <= 1;
}

function scoreMatch(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;

  if (t === q) return 1000;
  if (t.includes(q)) return 800 + (q.length / t.length) * 100;
  if (q.includes(t)) return 750 + (t.length / q.length) * 100;

  const queryTokens = meaningfulTokens(q);
  const targetTokens = meaningfulTokens(t);
  if (queryTokens.length === 0) {
    const fallbackTokens = tokenize(q);
    if (fallbackTokens.length === 0) return 0;
    let matched = 0;
    for (const qt of fallbackTokens) {
      if (tokenize(t).some((tt) => tokensMatchFuzzy(qt, tt))) matched++;
    }
    const ratio = matched / fallbackTokens.length;
    if (ratio < 0.35) return 0;
    return ratio * 500 + matched * 20;
  }

  let matched = 0;
  for (const qt of queryTokens) {
    if (targetTokens.some((tt) => tokensMatchFuzzy(qt, tt))) {
      matched++;
    }
  }

  const ratio = matched / queryTokens.length;
  if (ratio < 0.35) return 0;

  if (q.length >= 40 && !t.includes(q) && !q.includes(t) && ratio < 0.5) {
    return 0;
  }

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
  if (ratio < 0.55) return 0;

  return ratio * 2000 + matched * 100;
}

function buildFinalRoundCorrectAnswers(
  query: string,
  choices: { text: string; correct?: boolean }[],
  categoryScore: number
): string[] {
  const allCorrect = choices
    .filter((c) => c.correct)
    .map((c) => stripMarkup(c.text));

  const itemMatches = allCorrect
    .map((text) => ({ text, score: scoreMatch(query, text) }))
    .filter((item) => item.score >= FINAL_ITEM_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);

  const bestItemScore = itemMatches[0]?.score ?? 0;
  const categoryDominates =
    categoryScore >= STRONG_CATEGORY_SCORE &&
    categoryScore >= bestItemScore;

  if (categoryDominates || itemMatches.length === 0) {
    return sortAlphabetically(allCorrect);
  }

  return sortAlphabetically(itemMatches.map((item) => item.text));
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

function pickTopResults<T extends { score: number }>(
  items: T[],
  getKey: (item: T) => string,
  limit = MAX_SEARCH_RESULTS,
  minScore = MIN_MATCH_SCORE
): T[] {
  const sorted = [...items]
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: T[] = [];

  for (const item of sorted) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
    if (results.length >= limit) break;
  }

  return results;
}

function filterByConfidence<T extends SearchResult>(results: T[]): T[] {
  return results.filter((result) => getMatchConfidence(result) >= MIN_CONFIDENCE);
}

export function searchTrivia(
  data: GameData,
  query: string,
  limit = MAX_SEARCH_RESULTS
) {
  if (!query.trim()) return [];

  const ranked = data.trivia.map((question) => {
    const questionScore = scoreMatch(query, question.question);
    const choiceScore = scoreChoiceMatch(query, question.choices);
    const correct = question.choices.find((c) => c.correct);

    return {
      type: "trivia" as const,
      question,
      correctAnswer: correct ? stripMarkup(correct.text) : "—",
      score: Math.max(questionScore, choiceScore),
    };
  });

  return filterByConfidence(
    pickTopResults(ranked, (item) => item.question.id, limit)
  );
}

export function searchFinalRound(
  data: GameData,
  query: string,
  limit = MAX_SEARCH_RESULTS
) {
  if (!query.trim()) return [];

  const ranked = data.finalRound.map((question) => {
    const categoryScore = scoreCategoryMatch(query, question.categoryName);
    const choiceScore = scoreChoiceMatch(query, question.choices);
    const correctAnswers = buildFinalRoundCorrectAnswers(
      query,
      question.choices,
      categoryScore
    );

    return {
      type: "finalRound" as const,
      question,
      correctAnswers,
      wrongAnswers: question.choices
        .filter((c) => !c.correct)
        .map((c) => stripMarkup(c.text)),
      score: Math.max(categoryScore, choiceScore),
    };
  });

  return filterByConfidence(
    pickTopResults(
      ranked,
      (item) => item.question.id,
      limit,
      MIN_FINAL_ROUND_SCORE
    )
  );
}

export function searchSubjective(
  data: GameData,
  query: string,
  limit = MAX_SEARCH_RESULTS
) {
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
      choices: sortAlphabetically(
        question.choices.map((c) => stripMarkup(c.text))
      ),
      introLines,
      score: Math.max(questionScore, choiceScore, introScore),
    };
  });

  return filterByConfidence(
    pickTopResults(ranked, (item) => item.question.id, limit)
  );
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

export function searchVo(
  data: GameData,
  query: string,
  limit = MAX_SEARCH_RESULTS
) {
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
    .filter((item) => item.score > 0);

  return filterByConfidence(
    pickTopResults(ranked, (item) => item.entry.id, limit)
  );
}

const MODE_HOTKEY_INDEX: Record<QuestionMode, number> = {
  trivia: 1,
  finalRound: 2,
  subjective: 3,
  vo: 4,
};

export function findSuggestedMode(
  data: GameData,
  query: string,
  currentMode: QuestionMode
): { mode: QuestionMode; confidence: number; hotkey: number } | null {
  if (!query.trim()) return null;

  const searchByMode: Record<
    QuestionMode,
    (d: GameData, q: string) => SearchResult[]
  > = {
    trivia: searchTrivia,
    finalRound: searchFinalRound,
    subjective: searchSubjective,
    vo: searchVo,
  };

  const currentTop = searchByMode[currentMode](data, query)[0];
  const currentConfidence = currentTop ? getMatchConfidence(currentTop) : 0;
  if (currentConfidence >= 30) return null;

  let best: { mode: QuestionMode; confidence: number } | null = null;

  for (const mode of Object.keys(searchByMode) as QuestionMode[]) {
    if (mode === currentMode) continue;
    const top = searchByMode[mode](data, query)[0];
    if (!top) continue;
    const confidence = getMatchConfidence(top);
    if (confidence < 35) continue;
    if (!best || confidence > best.confidence) {
      best = { mode, confidence };
    }
  }

  if (!best) return null;
  return { ...best, hotkey: MODE_HOTKEY_INDEX[best.mode] };
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

export function getMatchConfidence(result: SearchResult): number {
  const score = result.score;
  switch (result.type) {
    case "trivia":
    case "subjective":
      return Math.min(100, Math.max(5, Math.round((score / 1000) * 100)));
    case "finalRound":
    case "vo":
      if (score >= 8500) {
        return Math.min(100, Math.round(88 + (score - 8500) / 300));
      }
      return Math.min(87, Math.max(5, Math.round((score / 8500) * 87)));
  }
}
