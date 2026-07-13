// Keyword engine. exact = whole-word (word-boundary) match; fuzzy = substring.
// Negative keywords veto the whole automation. ai_intent/sentiment are Phase 2 —
// they fall back to exact so reserved automations still behave predictably.
export interface KeywordRow { word: string; is_negative: boolean }
export interface MatchResult { matched: boolean; keyword?: string; vetoed?: boolean }

function norm(s: string): string { return s.toLowerCase().trim(); }

function hitsExact(text: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${w}([^\\p{L}\\p{N}]|$)`, 'iu').test(text);
}
function hitsFuzzy(text: string, word: string): boolean {
  return text.includes(word);
}

export function matchKeyword(
  rawText: string,
  keywords: KeywordRow[],
  matchMode: string,
): MatchResult {
  const text = norm(rawText);
  const fuzzy = matchMode === 'fuzzy';
  const hit = (word: string) => (fuzzy ? hitsFuzzy(text, norm(word)) : hitsExact(text, norm(word)));

  for (const k of keywords) {
    if (k.is_negative && hit(k.word)) return { matched: false, vetoed: true };
  }
  for (const k of keywords) {
    if (!k.is_negative && hit(k.word)) return { matched: true, keyword: k.word };
  }
  return { matched: false };
}
