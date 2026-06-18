export interface HighlightPart {
  text: string;
  match: boolean;
}

export function getHighlightParts(
  text: string,
  query: string
): HighlightPart[] {
  if (!text || !query.trim()) {
    return [{ text: text || "", match: false }];
  }

  const source = text;
  const q = query.trim();
  const lowerSource = source.toLowerCase();
  const lowerQuery = q.toLowerCase();

  const ranges: { start: number; end: number }[] = [];

  let idx = lowerSource.indexOf(lowerQuery);
  if (idx !== -1) {
    ranges.push({ start: idx, end: idx + q.length });
  } else {
    for (const token of q.split(/\s+/).filter((t) => t.length > 2)) {
      const tokenLower = token.toLowerCase();
      let from = 0;
      while (from < lowerSource.length) {
        const at = lowerSource.indexOf(tokenLower, from);
        if (at === -1) break;
        ranges.push({ start: at, end: at + token.length });
        from = at + token.length;
      }
    }
  }

  if (ranges.length === 0) {
    return [{ text: source, match: false }];
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      parts.push({ text: source.slice(cursor, range.start), match: false });
    }
    parts.push({ text: source.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < source.length) {
    parts.push({ text: source.slice(cursor), match: false });
  }

  return parts.filter((p) => p.text.length > 0);
}

export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const parts = getHighlightParts(text, query);

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i}>{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
