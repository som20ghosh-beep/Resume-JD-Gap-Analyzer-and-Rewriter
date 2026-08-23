import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-errors";
import { getLatestResumeVersion } from "@/lib/resume/versions";
import { getJobDescriptionRecord } from "@/lib/jd/store";
import { computeAtsScore } from "@/lib/ats/score";
import { saveAtsScoreRecord } from "@/lib/ats/store";

const BodySchema = z.object({
  resumeId: z.string().min(1),
  jdId: z.string().min(1),
});

export async function POST(request: Request) {
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
    const score = computeAtsScore(resume, jd);
    await saveAtsScoreRecord(body.resumeId, resume.version, body.jdId, score);
    return NextResponse.json({ score });
  } catch (err) {
    console.error("scoring failed", err);
    return apiError("INTERNAL_ERROR", "Failed to compute the ATS score.", 500);
  }
}
