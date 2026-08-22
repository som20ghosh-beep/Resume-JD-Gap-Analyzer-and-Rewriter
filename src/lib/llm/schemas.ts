import { z } from "zod";
import { RequirementPrioritySchema, RequirementTypeSchema } from "@/lib/types";

/** Shape the LLM fills for JD extraction. Ids are assigned by our own code afterward — the
 *  model never invents identifiers, and keywords get alias-expanded deterministically rather
 *  than trusted as-is (spec §4: "canonical + surface variants"). */
export const JdExtractionSchema = z.object({
  title: z.string(),
  company: z.string().optional(),
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
