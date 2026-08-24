import type { AtsScore, JobDescription, Resume, Suggestion } from "@/lib/types";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Something went wrong.");
  }
  return body as T;
}

export async function parseResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
  const body = await parseJsonOrThrow<{ resume: Resume }>(res);
  return body.resume;
}

export async function parseJobDescription(input: { text: string } | { url: string }): Promise<JobDescription> {
  const res = await fetch("/api/jd/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ jd: JobDescription }>(res);
  return body.jd;
}

export async function analyze(
  resumeId: string,
  jdId: string,
): Promise<{ suggestions: Suggestion[]; baselineScore: AtsScore }> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, jdId }),
  });
  return parseJsonOrThrow(res);
}

export async function downloadExport(resumeId: string, format: "pdf" | "docx" | "txt"): Promise<void> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, format }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Failed to export the resume.");
  }

  const blob = await res.blob();
  const fileName = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `resume.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function applySuggestions(
  resumeId: string,
  approvedSuggestions: Suggestion[],
): Promise<{ resume: Resume; newScore: AtsScore; changelog: string }> {
  const res = await fetch("/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, approvedSuggestions }),
  });
  return parseJsonOrThrow(res);
}
