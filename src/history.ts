const HISTORY_KEY = "tmp3-search-history";
const MAX_HISTORY = 10;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;

  const next = [
    trimmed,
    ...getSearchHistory().filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_HISTORY);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
