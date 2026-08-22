import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { listResumeVersions } from "@/lib/resume/versions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const versions = await listResumeVersions(id);

  if (versions.length === 0) {
    return apiError("NOT_FOUND", "No resume document found for this id.", 404);
  }

  return NextResponse.json({ versions });
}
