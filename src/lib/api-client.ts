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
