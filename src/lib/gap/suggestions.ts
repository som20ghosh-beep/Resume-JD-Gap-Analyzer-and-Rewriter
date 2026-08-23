import type { Requirement, Resume, Suggestion } from "@/lib/types";
import type { SuggestionDraftItem } from "@/lib/llm/schemas";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Every id a suggestion is allowed to target — used both to constrain the LLM call's schema
 *  and, defensively, to strip any id here that doesn't (spec §8: never trust LLM ids as-is). */
export function collectValidItemIds(resume: Resume): Set<string> {
  const ids = new Set<string>();
  for (const exp of resume.experience) for (const b of exp.bullets) ids.add(b.id);
  for (const s of resume.skills) ids.add(s.id);
  for (const p of resume.projects ?? []) ids.add(p.id);
  for (const c of resume.certifications ?? []) ids.add(c.id);
  return ids;
}

/** Turns raw LLM drafts into persisted Suggestions, enforcing the spec §3.1 bucket rules
 *  regardless of what the model actually returned — this is the safety layer the acceptance
 *  criteria depend on ("GAP items cannot be added to the resume through any UI path", "no
 *  skill appears without explicit user approval"), not just prompt instructions. */
export function buildSuggestionsFromDraft(
  unmatched: Requirement[],
  drafts: SuggestionDraftItem[],
  validItemIds: Set<string>,
): Suggestion[] {
  const requirementById = new Map(unmatched.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];

  for (const draft of drafts) {
    const requirement = requirementById.get(draft.requirementId);
    if (!requirement || seen.has(requirement.id)) continue;
    seen.add(requirement.id);

    if (draft.action === "GAP") {
      // Advice-only bucket: never carries a resume edit, even if the model filled one in.
      suggestions.push({
        id: newId("sugg"),
        requirementId: requirement.id,
        requirementText: requirement.text,
        action: "GAP",
        targetSection: null,
        rationale: draft.rationale,
        status: "PENDING",
      });
      continue;
    }

    if (draft.action === "CONFIRM") {
      // The actual text is written later, only from the user's own confirmed input.
      suggestions.push({
        id: newId("sugg"),
        requirementId: requirement.id,
        requirementText: requirement.text,
        action: "CONFIRM",
        targetSection: draft.targetSection,
        rationale: draft.rationale,
        evidence: draft.evidence ?? undefined,
        status: "PENDING",
      });
      continue;
    }

    // REPHRASE with no proposed rewording is malformed — drop it rather than show the user
    // an approve button with nothing to approve.
    if (!draft.proposedText) continue;

    const targetItemId =
      draft.targetItemId && validItemIds.has(draft.targetItemId) ? draft.targetItemId : undefined;

    suggestions.push({
      id: newId("sugg"),
      requirementId: requirement.id,
      requirementText: requirement.text,
      action: "REPHRASE",
      targetSection: draft.targetSection,
      targetItemId,
      currentText: draft.currentText ?? undefined,
      proposedText: draft.proposedText,
      rationale: draft.rationale,
      evidence: draft.evidence ?? undefined,
      status: "PENDING",
    });
  }

  return suggestions;
}
