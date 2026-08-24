import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-errors";
import { getLatestResumeVersion } from "@/lib/resume/versions";
import { renderResumeAsTxt } from "@/lib/export/txt";
import { renderResumeAsDocx } from "@/lib/export/docx";
import { renderResumeAsPdf } from "@/lib/export/pdf";
import { TEMPLATE_IDS } from "@/components/templates/registry";

const BodySchema = z.object({
  resumeId: z.string().min(1),
  format: z.enum(["pdf", "docx", "txt"]),
  templateId: z.enum(TEMPLATE_IDS).default("ats-safe"),
});

const CONTENT_TYPE: Record<z.infer<typeof BodySchema>["format"], string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

function fileNameFor(resumeName: string, format: string): string {
  const safe = resumeName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "resume";
  return `${safe}.${format}`;
}

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return apiError(
      "INVALID_REQUEST",
      "Expected JSON with 'resumeId' and 'format' (pdf, docx, or txt).",
      400,
    );
  }

  const resume = await getLatestResumeVersion(body.resumeId);
  if (!resume) {
    return apiError("RESUME_NOT_FOUND", "No resume found for the given resumeId.", 404);
  }

  try {
    const payload: BodyInit =
      body.format === "pdf"
        ? new Blob([new Uint8Array(await renderResumeAsPdf(resume, body.templateId))])
        : body.format === "docx"
          ? new Blob([new Uint8Array(await renderResumeAsDocx(resume, body.templateId))])
          : renderResumeAsTxt(resume);

    return new NextResponse(payload, {
      headers: {
        "Content-Type": CONTENT_TYPE[body.format],
        "Content-Disposition": `attachment; filename="${fileNameFor(resume.contact.name, body.format)}"`,
      },
    });
  } catch (err) {
    console.error("export failed", err);
    return apiError("INTERNAL_ERROR", "Failed to export the resume.", 500);
  }
}
