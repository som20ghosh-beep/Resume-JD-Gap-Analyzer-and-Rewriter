import { NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import { apiError } from "@/lib/api-errors";
import { ParseError } from "@/lib/parsers/errors";
import { LlmExtractionError } from "@/lib/llm/extract-structured";
import { fetchJobPostingText } from "@/lib/jd/fetch-url";
import { extractJobDescription } from "@/lib/jd/extract";
import { createJobDescriptionRecord } from "@/lib/jd/store";
import { isRateLimited } from "@/lib/rate-limit";

const MIN_TEXT_CHARS = 30;

const BodySchema = z
  .object({
    text: z.string().min(MIN_TEXT_CHARS).optional(),
    url: z.string().min(1).optional(),
  })
  .refine((b) => Boolean(b.text) !== Boolean(b.url), {
    message: "Provide exactly one of 'text' or 'url'.",
  });

export async function POST(request: Request) {
  if (isRateLimited("jd-parse", 10, 60_000)) {
    return apiError(
      "RATE_LIMITED",
      "Too many job description parse requests. Please wait a moment and try again.",
      429,
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return apiError(
      "INVALID_REQUEST",
      "Expected JSON with exactly one of 'text' or 'url'.",
      400,
    );
  }

  try {
    const rawText = body.url ? await fetchJobPostingText(body.url) : body.text!;
    const jd = await extractJobDescription(rawText);
    const persisted = await createJobDescriptionRecord(jd);
    return NextResponse.json({ jd: persisted });
  } catch (err) {
    if (err instanceof ParseError) return apiError(err.code, err.message, 422);
    if (err instanceof LlmExtractionError) return apiError(err.code, err.message, 502);
    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return apiError(
        "MISSING_API_KEY",
        "GROQ_API_KEY is not configured. Add it to .env.local and restart the server.",
        500,
      );
    }
    if (err instanceof Groq.AuthenticationError) {
      return apiError("LLM_AUTH_FAILED", "The Groq API key was rejected.", 500);
    }
    if (err instanceof Groq.RateLimitError) {
      return apiError("LLM_RATE_LIMITED", "The Groq API rate-limited this request.", 429);
    }
    if (err instanceof Groq.APIError) {
      return apiError("LLM_API_ERROR", "The Groq API returned an error.", 502);
    }
    console.error("jd parse failed", err);
    return apiError("INTERNAL_ERROR", "Failed to parse the job description.", 500);
  }
}
