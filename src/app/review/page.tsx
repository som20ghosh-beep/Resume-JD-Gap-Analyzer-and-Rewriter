"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { useReviewStore } from "@/store/review-store";
import { applySuggestions } from "@/lib/api-client";
import { SuggestionCard } from "@/components/suggestions/suggestion-card";
import { GapsPanel } from "@/components/suggestions/gaps-panel";
import { ProjectedScoreBar } from "@/components/suggestions/projected-score-bar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingRedirect } from "@/components/status/loading-redirect";

export default function ReviewPage() {
  const router = useRouter();
  const hasAnalysis = useReviewStore((s) => s.hasAnalysis);
  const resume = useReviewStore((s) => s.resume);
  const suggestions = useReviewStore((s) => s.suggestions);
  const setApplyResult = useReviewStore((s) => s.setApplyResult);

  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAnalysis) router.replace("/");
  }, [hasAnalysis, router]);

  if (!hasAnalysis || !resume) return <LoadingRedirect />;

  const reviewable = suggestions.filter((s) => s.action === "REPHRASE" || s.action === "CONFIRM");
  const gaps = suggestions.filter((s) => s.action === "GAP");
  const approvedCount = suggestions.filter((s) => s.status === "APPROVED").length;

  const handleApply = async () => {
    setError(null);
    setIsApplying(true);
    try {
      const approved = suggestions.filter((s) => s.status === "APPROVED");
      const result = await applySuggestions(resume.id, approved);
      setApplyResult(result);
      router.push("/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply your approved suggestions.");
      setIsApplying(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review suggestions</h1>
        <p className="text-sm text-muted-foreground">
          Approve, reject, or edit each one. Nothing is written to your resume until you apply them.
        </p>
      </div>

      <ProjectedScoreBar />

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Couldn&apos;t apply your changes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {reviewable.length === 0 && gaps.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Every requirement in this job description is already reflected in your resume.
        </p>
      )}

      <div className="space-y-4">
        {reviewable.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>

      <GapsPanel gaps={gaps} />

      {reviewable.length > 0 && (
        <Button
          onClick={handleApply}
          disabled={approvedCount === 0 || isApplying}
          aria-busy={isApplying}
          className="self-start"
        >
          {isApplying && <Loader2 className="animate-spin" />}
          {isApplying ? "Applying…" : `Apply ${approvedCount} approved change${approvedCount === 1 ? "" : "s"}`}
        </Button>
      )}
    </main>
  );
}
