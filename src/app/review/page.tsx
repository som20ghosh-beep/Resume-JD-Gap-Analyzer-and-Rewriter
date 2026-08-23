"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReviewStore } from "@/store/review-store";
import { SuggestionCard } from "@/components/suggestions/suggestion-card";
import { GapsPanel } from "@/components/suggestions/gaps-panel";
import { ProjectedScoreBar } from "@/components/suggestions/projected-score-bar";

export default function ReviewPage() {
  const router = useRouter();
  const hasAnalysis = useReviewStore((s) => s.hasAnalysis);
  const suggestions = useReviewStore((s) => s.suggestions);

  useEffect(() => {
    if (!hasAnalysis) router.replace("/");
  }, [hasAnalysis, router]);

  if (!hasAnalysis) return null;

  const reviewable = suggestions.filter((s) => s.action === "REPHRASE" || s.action === "CONFIRM");
  const gaps = suggestions.filter((s) => s.action === "GAP");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review suggestions</h1>
        <p className="text-sm text-muted-foreground">
          Approve, reject, or edit each one. Nothing is written to your resume until you apply them.
        </p>
      </div>

      <ProjectedScoreBar />

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
    </main>
  );
}
