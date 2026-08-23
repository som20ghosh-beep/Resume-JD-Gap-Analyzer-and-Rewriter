import { z } from "zod";
import {
  RequirementPrioritySchema,
  RequirementTypeSchema,
  SuggestionActionSchema,
  SuggestionTargetSectionSchema,
} from "@/lib/types";

/** Shape the LLM fills for JD extraction. Ids are assigned by our own code afterward — the
 *  model never invents identifiers, and keywords get alias-expanded deterministically rather
 *  than trusted as-is (spec §4: "canonical + surface variants").
 *
 *  `company` is `.nullable()` rather than `.optional()`: Groq's strict structured-output mode
 *  requires every field to be present in `required` (a key can be absent from the source text,
 *  but not from the JSON shape) — see src/lib/llm/extract-structured.ts. */
export const JdExtractionSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  requirements: z.array(
    z.object({
      text: z.string(),
      type: RequirementTypeSchema,
      priority: RequirementPrioritySchema,
      keywords: z.array(z.string()),
    }),
  ),
});
export type JdExtraction = z.infer<typeof JdExtractionSchema>;

/** Shape the LLM fills for one gap-analysis suggestion (spec §3.1, §5 phase 5). Called only
 *  for JD requirements the deterministic keyword matcher already found no evidence for —
 *  the model's job is to judge whether that missing evidence is actually buried/reworded
 *  (REPHRASE), plausibly adjacent (CONFIRM), or a genuine gap (GAP).
 *
 *  `requirementId` and `targetItemId` are re-typed per call in src/lib/gap/draft.ts to a
 *  `z.enum` of the real ids in play, so Groq's strict/constrained decoding makes it
 *  structurally impossible for the model to reference an id that doesn't exist — the
 *  `z.string()` here is just the base shape's placeholder type. All optional-in-spirit
 *  fields are `.nullable()` rather than `.optional()` for the same strict-mode reason as
 *  `JdExtractionSchema.company` above. */
export const SuggestionDraftItemSchema = z.object({
  requirementId: z.string(),
  action: SuggestionActionSchema,
  targetSection: SuggestionTargetSectionSchema,
  targetItemId: z.string().nullable(),
  currentText: z.string().nullable(),
  proposedText: z.string().nullable(),
  rationale: z.string(),
  evidence: z.string().nullable(),
});
export type SuggestionDraftItem = z.infer<typeof SuggestionDraftItemSchema>;

export const SuggestionDraftSchema = z.object({
  suggestions: z.array(SuggestionDraftItemSchema),
});
export type SuggestionDraft = z.infer<typeof SuggestionDraftSchema>;
