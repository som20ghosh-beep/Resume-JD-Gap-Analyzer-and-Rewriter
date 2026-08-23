"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { ResumeDropzone } from "@/components/upload/resume-dropzone";
import { JdInput, type JdInputMode } from "@/components/upload/jd-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { parseJobDescription, parseResume, analyze } from "@/lib/api-client";
import { useReviewStore } from "@/store/review-store";
import type { JobDescription, Resume } from "@/lib/types";

type Step = "input" | "parsing" | "preview" | "analyzing";

export default function Home() {
  const router = useRouter();
  const setAnalysis = useReviewStore((s) => s.setAnalysis);

  const [step, setStep] = useState<Step>("input");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jdMode, setJdMode] = useState<JdInputMode>("text");
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [jd, setJd] = useState<JobDescription | null>(null);

  const canParse = Boolean(file) && (jdMode === "text" ? jdText.trim().length >= 30 : jdUrl.trim().length > 0);

  const handleParse = async () => {
    if (!file) return;
    setError(null);
    setStep("parsing");
    try {
      const [parsedResume, parsedJd] = await Promise.all([
        parseResume(file),
        parseJobDescription(jdMode === "text" ? { text: jdText } : { url: jdUrl }),
      ]);
      setResume(parsedResume);
      setJd(parsedJd);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse your resume and job description.");
      setStep("input");
    }
  };

  const handleAnalyze = async () => {
    if (!resume || !jd) return;
    setError(null);
    setStep("analyzing");
    try {
      const { suggestions, baselineScore } = await analyze(resume.id, jd.id);
      setAnalysis({ resume, jd, baselineScore, suggestions });
      router.push("/analyze");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze your resume against this job description.");
      setStep("preview");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">ResumeFit</h1>
        <p className="text-sm text-muted-foreground">
          Upload your resume and a job description to see exactly where they don&apos;t line up.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step !== "preview" && step !== "analyzing" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumeDropzone file={file} onFileSelected={(f, err) => { setFile(f); setFileError(err ?? null); }} error={fileError} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <JdInput mode={jdMode} onModeChange={setJdMode} text={jdText} onTextChange={setJdText} url={jdUrl} onUrlChange={setJdUrl} />
            </CardContent>
          </Card>
        </div>
      )}

      {step === "input" && (
        <Button onClick={handleParse} disabled={!canParse} className="self-start">
          Parse & preview
        </Button>
      )}

      {step === "parsing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Parsing your resume and job description…
        </div>
      )}

      {(step === "preview" || step === "analyzing") && resume && jd && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{resume.contact.name || "Resume"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{resume.contact.email || "No email detected"}</p>
                <p>
                  {resume.experience.length} experience entr{resume.experience.length === 1 ? "y" : "ies"} ·{" "}
                  {resume.skills.length} skill{resume.skills.length === 1 ? "" : "s"} · {resume.education.length}{" "}
                  education entr{resume.education.length === 1 ? "y" : "ies"}
                </p>
                {resume.parseWarnings.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-status-warning">
                    {resume.parseWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{jd.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{jd.company || "Company not detected"}</p>
                <p className="flex items-center gap-2">
                  <Badge variant="outline">{jd.requirements.length} requirements extracted</Badge>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleAnalyze} disabled={step === "analyzing"}>
              {step === "analyzing" && <Loader2 className="animate-spin" />}
              {step === "analyzing" ? "Analyzing…" : "Looks good — analyze"}
            </Button>
            <Button
              variant="ghost"
              disabled={step === "analyzing"}
              onClick={() => {
                setStep("input");
                setResume(null);
                setJd(null);
              }}
            >
              Start over
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
