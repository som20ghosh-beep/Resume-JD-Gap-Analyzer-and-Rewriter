import type { JobDescription } from "@/lib/types";
import { expandKeywordVariants } from "@/lib/ats/aliases";
import { extractStructured } from "@/lib/llm/extract-structured";
import { JdExtractionSchema } from "@/lib/llm/schemas";
import {
  JD_EXTRACTION_SYSTEM_PROMPT,
  buildJdExtractionUserContent,
} from "@/lib/llm/prompts/jd-extraction";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function extractJobDescription(rawText: string): Promise<JobDescription> {
  const extraction = await extractStructured({
    name: "jd-extraction",
    system: JD_EXTRACTION_SYSTEM_PROMPT,
    userContent: buildJdExtractionUserContent(rawText),
    schema: JdExtractionSchema,
    temperature: 0,
  });

  return {
    id: newId("jd"),
    title: extraction.title,
    company: extraction.company ?? undefined,
    rawText,
    requirements: extraction.requirements.map((r) => ({
      id: newId("req"),
      text: r.text,
      type: r.type,
      priority: r.priority,
      keywords: Array.from(new Set(r.keywords.flatMap(expandKeywordVariants))),
    })),
  };
}
