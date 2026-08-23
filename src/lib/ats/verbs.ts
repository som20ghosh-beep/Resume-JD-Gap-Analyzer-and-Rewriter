// Strong resume action verbs for ATS category D (spec §5D). A bullet "starts with a strong
// action verb" when its first word, lowercased, is in this set — covers common past-tense
// resume verbs plus a few present-tense forms for bullets written in that style.
const ACTION_VERBS = new Set([
  "achieved", "accelerated", "administered", "advised", "analyzed", "architected", "audited",
  "authored", "automated", "budgeted", "built", "chaired", "championed", "coached",
  "collaborated", "conceived", "consolidated", "constructed", "coordinated", "created",
  "cultivated", "decreased", "delivered", "deployed", "designed", "developed", "devised",
  "directed", "drove", "eliminated", "engineered", "enhanced", "established", "executed",
  "expanded", "expedited", "facilitated", "forecasted", "formulated", "founded", "generated",
  "grew", "guided", "headed", "implemented", "improved", "increased", "influenced", "initiated",
  "innovated", "instituted", "integrated", "introduced", "invented", "launched", "led",
  "leveraged", "managed", "mentored", "migrated", "modernized", "negotiated", "optimized",
  "orchestrated", "overhauled", "oversaw", "pioneered", "planned", "presented", "prioritized",
  "produced", "programmed", "published", "rebuilt", "reduced", "refactored", "reengineered",
  "resolved", "restructured", "revamped", "scaled", "shipped", "simplified", "solved",
  "spearheaded", "standardized", "streamlined", "strengthened", "structured", "supervised",
  "trained", "transformed", "unified", "unlocked", "upgraded", "validated", "won", "wrote",
]);

/** Strips leading bullet glyphs/punctuation before checking the first word. */
export function startsWithActionVerb(text: string): boolean {
  const firstWord = text
    .trim()
    .replace(/^[-*••●–—\d.)\s]+/, "")
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  return firstWord ? ACTION_VERBS.has(firstWord) : false;
}
