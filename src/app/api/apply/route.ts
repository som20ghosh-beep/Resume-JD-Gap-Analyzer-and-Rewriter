import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-errors";
import { SuggestionSchema } from "@/lib/types";
import { appendResumeVersion, getLatestResumeVersion } from "@/lib/resume/versions";
import { getJobDescriptionRecord } from "@/lib/jd/store";
import { getLatestJdIdForResume, saveAtsScoreRecord } from "@/lib/ats/store";
import { computeAtsScore } from "@/lib/ats/score";
import { applyApprovedSuggestions } from "@/lib/resume/apply";
import { generateChangelog } from "@/lib/resume/changelog";

const BodySchema = z.object({
  resumeId: z.string().min(1),
  approvedSuggestions: z.array(SuggestionSchema),
});

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return apiError("INVALID_REQUEST", "Expected JSON with 'resumeId' and 'approvedSuggestions'.", 400);
  }

  const resume = await getLatestResumeVersion(body.resumeId);
  if (!resume) {
    return apiError("RESUME_NOT_FOUND", "No resume found for the given resumeId.", 404);
  }

  const jdId = await getLatestJdIdForResume(body.resumeId);
  if (!jdId) {
    return apiError(
      "NO_ANALYSIS_FOUND",
      "Run an analysis for this resume before applying suggestions.",
      409,
    );
  }
  const jd = await getJobDescriptionRecord(jdId);
  if (!jd) {
    return apiError(
      "JD_NOT_FOUND",
      "The job description this resume was last analyzed against no longer exists.",
      404,
    );
  }

  try {
    const { resume: updatedResume, applied } = applyApprovedSuggestions(resume, body.approvedSuggestions);

    if (applied.length === 0) {
      return apiError(
        "NOTHING_TO_APPLY",
        "None of the submitted suggestions could be applied — check that CONFIRM items include your input.",
        422,
      );
    }

    const changelog = generateChangelog(applied);
    const newVersion = await appendResumeVersion(body.resumeId, updatedResume, changelog);
    const newScore = computeAtsScore(newVersion, jd);
    await saveAtsScoreRecord(body.resumeId, newVersion.version, jdId, newScore);

    return NextResponse.json({ resume: newVersion, newScore, changelog });
  } catch (err) {
    console.error("apply failed", err);
    return apiError("INTERNAL_ERROR", "Failed to apply the approved suggestions.", 500);
  }
}
