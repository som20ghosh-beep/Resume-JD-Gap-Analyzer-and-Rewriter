import { z } from "zod";
import { RequirementPrioritySchema, RequirementTypeSchema } from "@/lib/types";

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
