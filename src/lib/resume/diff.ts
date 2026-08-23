import { diff_match_patch } from "diff-match-patch";

export type DiffSegment = { type: "equal" | "insert" | "delete"; text: string };

function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

/** Word-level diff for the REPHRASE before/after cards (spec §6 screen 3: "word-level
 *  before/after diff ... additions green, deletions struck red"). diff-match-patch is
 *  character-level by default; this uses its own documented line-mode trick at word
 *  granularity instead — join tokens with "\n", diff on the resulting per-token chars, then
 *  expand back — so a run of changed words reads as one segment, not a scatter of single
 *  characters. cleanupSemantic runs on the token-encoded diff (before expansion), not after,
 *  so it groups whole tokens instead of re-drifting into mid-word boundaries. */
export function computeWordDiff(before: string, after: string): DiffSegment[] {
  const dmp = new diff_match_patch();
  const beforeJoined = tokenize(before).join("\n");
  const afterJoined = tokenize(after).join("\n");

  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(beforeJoined, afterJoined);
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_cleanupSemantic(diffs);
  dmp.diff_charsToLines_(diffs, lineArray);

  return diffs.map(([op, data]) => ({
    type: op === 1 ? "insert" : op === -1 ? "delete" : "equal",
    text: data.replace(/\n/g, ""),
  }));
}
