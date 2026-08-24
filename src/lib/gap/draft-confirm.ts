import type { Resume } from "@/lib/types";
import { extractStructured } from "@/lib/llm/extract-structured";
import { ConfirmDraftSchema } from "@/lib/llm/schemas";
import {
  CONFIRM_DRAFT_SYSTEM_PROMPT,
  buildConfirmDraftUserContent,
} from "@/lib/llm/prompts/confirm-draft";

/** Drafts a starting-point statement for a CONFIRM suggestion's "Generate" button. This is
 *  the one place in the app where the model is allowed to write words a user might approve
 *  onto their own resume without having typed them first — the anti-fabrication rules live
 *  entirely in the prompt (bracketed placeholders instead of invented specifics), since
 *  there's no deterministic way to verify a free-text personal statement the way suggestion
 *  drafting's id-constrained schema verifies references. The user still must review, edit,
 *  and explicitly click Approve — nothing here writes to the resume by itself. */
export async function draftConfirmStatement(
  resume: Resume,
  requirementText: string,
  rationale: string,
): Promise<string> {
  const result = await extractStructured({
    name: "confirm-draft",
    system: CONFIRM_DRAFT_SYSTEM_PROMPT,
    userContent: buildConfirmDraftUserContent(resume, requirementText, rationale),
    schema: ConfirmDraftSchema,
    temperature: 0.3,
  });
  return result.draft;
}
