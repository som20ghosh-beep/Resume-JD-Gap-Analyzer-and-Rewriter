import type { Suggestion } from "@/lib/types";

function describeChange(suggestion: Suggestion): string {
  if (suggestion.action === "REPHRASE") {
    return `Rephrased to address "${suggestion.requirementText}" — ${suggestion.rationale}`;
  }
  return `Added confirmed skill "${suggestion.requirementText}" based on your input: "${suggestion.userInput}"`;
}

/** Human-readable summary of a resume version's changes (spec §7 phase 7: "generate
 *  changelog"). Takes the `applied` list from applyApprovedSuggestions, not the raw approved
 *  list, so it only ever describes edits that actually landed on the resume. */
export function generateChangelog(applied: Suggestion[]): string {
  if (applied.length === 0) return "No changes applied.";

  const lines = applied.map((s) => `- ${describeChange(s)}`);
  return [`Applied ${applied.length} suggestion${applied.length === 1 ? "" : "s"}:`, ...lines].join("\n");
}
