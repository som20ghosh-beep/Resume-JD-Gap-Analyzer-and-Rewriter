import { z } from "zod";
import type { JobDescription, Resume, Suggestion } from "@/lib/types";
import { matchRequirements } from "@/lib/ats/keywords";
import { extractStructured } from "@/lib/llm/extract-structured";
import { SuggestionDraftItemSchema } from "@/lib/llm/schemas";
import {
  SUGGESTION_DRAFTING_SYSTEM_PROMPT,
  buildSuggestionDraftingUserContent,
} from "@/lib/llm/prompts/suggestion-drafting";
import { buildSuggestionsFromDraft, collectValidItemIds } from "@/lib/gap/suggestions";

/** Re-types requirementId/targetItemId to a z.enum of the ids actually in play for this call.
 *  Groq's strict mode uses constrained decoding, so this makes it structurally impossible for
 *  the model to reference an id that doesn't exist — stronger than validating after the fact. */
function buildCallSchema(requirementIds: string[], itemIds: string[]) {
  const requirementIdField =
    requirementIds.length > 0 ? z.enum(requirementIds as [string, ...string[]]) : z.string();
  const targetItemIdField =
    itemIds.length > 0 ? z.enum(itemIds as [string, ...string[]]).nullable() : z.string().nullable();

  return z.object({
    suggestions: z.array(
      SuggestionDraftItemSchema.extend({
        requirementId: requirementIdField,
        targetItemId: targetItemIdField,
      }),
    ),
  });
}

/** Drafts gap-analysis suggestions for a resume/JD pair (spec §5 phase 5). Only calls the LLM
 *  when the deterministic keyword matcher (src/lib/ats/keywords.ts) found requirements with no
 *  evidence at all — a fully-matching resume never hits the network. */
export async function draftSuggestions(resume: Resume, jd: JobDescription): Promise<Suggestion[]> {
  const unmatched = matchRequirements(resume, jd)
    .filter((m) => !m.matched)
    .map((m) => m.requirement);

  if (unmatched.length === 0) return [];

  const validItemIds = collectValidItemIds(resume);
  const schema = buildCallSchema(
    unmatched.map((r) => r.id),
    Array.from(validItemIds),
  );

  const draft = await extractStructured({
    name: "suggestion-drafting",
    system: SUGGESTION_DRAFTING_SYSTEM_PROMPT,
    userContent: buildSuggestionDraftingUserContent(unmatched, resume),
    schema,
    temperature: 0.3,
  });

  return buildSuggestionsFromDraft(unmatched, draft.suggestions, validItemIds);
}
