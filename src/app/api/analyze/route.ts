import { NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import { apiError } from "@/lib/api-errors";
import { getLatestResumeVersion } from "@/lib/resume/versions";
import { getJobDescriptionRecord } from "@/lib/jd/store";
import { computeAtsScore } from "@/lib/ats/score";
import { saveAtsScoreRecord } from "@/lib/ats/store";
import { draftSuggestions } from "@/lib/gap/draft";
import { replaceSuggestions } from "@/lib/gap/store";
import { LlmExtractionError } from "@/lib/llm/extract-structured";
import { isRateLimited } from "@/lib/rate-limit";

const BodySchema = z.object({
  resumeId: z.string().min(1),
  jdId: z.string().min(1),
});

export async function POST(request: Request) {
  if (isRateLimited("analyze", 10, 60_000)) {
    return apiError(
      "RATE_LIMITED",
      "Too many analysis requests. Please wait a moment and try again.",
      429,
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return apiError("INVALID_REQUEST", "Expected JSON with 'resumeId' and 'jdId'.", 400);
  }

  const resume = await getLatestResumeVersion(body.resumeId);
  if (!resume) {
    return apiError("RESUME_NOT_FOUND", "No resume found for the given resumeId.", 404);
  }

  const jd = await getJobDescriptionRecord(body.jdId);
  if (!jd) {
    return apiError("JD_NOT_FOUND", "No job description found for the given jdId.", 404);
  }

  try {
    const baselineScore = computeAtsScore(resume, jd);
    await saveAtsScoreRecord(body.resumeId, resume.version, body.jdId, baselineScore);

    const drafted = await draftSuggestions(resume, jd);
    const suggestions = await replaceSuggestions(body.resumeId, body.jdId, drafted);

    return NextResponse.json({ suggestions, baselineScore });
  } catch (err) {
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
    console.error("analyze failed", err);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to analyze the resume against the job description.",
      500,
    );
  }
}
