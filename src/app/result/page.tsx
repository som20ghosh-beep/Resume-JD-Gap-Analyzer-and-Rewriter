"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useReviewStore } from "@/store/review-store";
import { downloadExport } from "@/lib/api-client";
import { ScoreGauge } from "@/components/analysis/score-gauge";
import { CategoryComparison } from "@/components/analysis/category-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingRedirect } from "@/components/status/loading-redirect";

type ExportFormat = "pdf" | "docx" | "txt";
const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "docx", label: "DOCX" },
  { format: "txt", label: "TXT" },
];

export default function ResultPage() {
  const router = useRouter();
  const hasApplied = useReviewStore((s) => s.hasApplied);
  const baselineScore = useReviewStore((s) => s.baselineScore);
  const newResume = useReviewStore((s) => s.newResume);
  const newScore = useReviewStore((s) => s.newScore);
  const changelog = useReviewStore((s) => s.changelog);
  const reset = useReviewStore((s) => s.reset);

  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasApplied) router.replace("/");
  }, [hasApplied, router]);

  if (!hasApplied || !baselineScore || !newScore || !newResume) return <LoadingRedirect />;

  const delta = Math.round((newScore.total - baselineScore.total) * 10) / 10;
  const changelogLines = (changelog ?? "").split("\n").filter(Boolean);

  const handleDownload = async (format: ExportFormat) => {
    setError(null);
    setDownloading(format);
    try {
      await downloadExport(newResume.id, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to export as ${format.toUpperCase()}.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Result</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s the effect of the changes you approved.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-center gap-8 py-6">
          <div className="flex flex-col items-center gap-2">
            <ScoreGauge score={baselineScore.total} size={140} />
            <span className="text-sm text-muted-foreground">Before</span>
          </div>
          <div className="text-center">
            <span className={delta >= 0 ? "text-delta-good-text text-2xl font-semibold" : "text-status-critical text-2xl font-semibold"}>
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreGauge score={newScore.total} size={140} />
            <span className="text-sm text-muted-foreground">After</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryComparison before={baselineScore.categories} after={newScore.categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Changelog</CardTitle>
        </CardHeader>
        <CardContent>
          {changelogLines.length > 0 ? (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {changelogLines.map((line, i) => (
                <li key={i} className={line.startsWith("-") ? "pl-4" : "font-medium text-foreground"}>
                  {line.replace(/^-\s*/, "")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No changes were recorded for this version.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Download</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert />
              <AlertTitle>Couldn&apos;t export your resume</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {EXPORT_FORMATS.map(({ format, label }) => (
              <Button
                key={format}
                variant="outline"
                onClick={() => handleDownload(format)}
                disabled={downloading !== null}
                aria-busy={downloading === format}
              >
                {downloading === format ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                {label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground">(ATS-Safe template)</span>
          </div>
          <Button variant="link" className="mt-2 h-auto p-0" onClick={() => router.push("/redesign")}>
            Want a different look? Try the template gallery →
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          reset();
          router.push("/");
        }}
      >
        Start a new analysis
      </Button>
    </main>
  );
}
