import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { ParseError } from "@/lib/parsers/errors";
import { parsePdf } from "@/lib/parsers/pdf";
import { parseDocx } from "@/lib/parsers/docx";
import { createResumeDocument } from "@/lib/resume/versions";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("INVALID_REQUEST", "Expected multipart/form-data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("MISSING_FILE", "No file was provided under the 'file' field.", 400);
  }

  if (file.size > MAX_FILE_BYTES) {
    return apiError("FILE_TOO_LARGE", "File exceeds the 5 MB limit.", 400);
  }

  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");

  if (!isPdf && !isDocx) {
    return apiError(
      "UNSUPPORTED_FILE_TYPE",
      "Only PDF and DOCX files are supported.",
      400,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const resume = isPdf ? await parsePdf(buffer) : await parseDocx(buffer);
    const persisted = await createResumeDocument(resume, file.name, file.type);
    return NextResponse.json({ resume: persisted });
  } catch (err) {
    if (err instanceof ParseError) {
      return apiError(err.code, err.message, 422);
    }
    console.error("resume parse failed", err);
    return apiError("INTERNAL_ERROR", "Failed to parse the resume.", 500);
  }
}
