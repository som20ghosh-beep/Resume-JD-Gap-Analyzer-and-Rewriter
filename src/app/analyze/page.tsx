"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wrench, MessageCircleQuestion, CircleX } from "lucide-react";
import { useReviewStore } from "@/store/review-store";
import { ScoreGauge } from "@/components/analysis/score-gauge";
import { CategoryBreakdown } from "@/components/analysis/category-breakdown";
import { RequirementCoverageTable } from "@/components/analysis/requirement-coverage-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AnalyzePage() {
  const router = useRouter();
  const hasAnalysis = useReviewStore((s) => s.hasAnalysis);
  const resume = useReviewStore((s) => s.resume);
  const jd = useReviewStore((s) => s.jd);
  const baselineScore = useReviewStore((s) => s.baselineScore);
  const suggestions = useReviewStore((s) => s.suggestions);

  useEffect(() => {
    if (!hasAnalysis) router.replace("/");
  }, [hasAnalysis, router]);

  if (!hasAnalysis || !resume || !jd || !baselineScore) return null;

  const rephraseCount = suggestions.filter((s) => s.action === "REPHRASE").length;
  const confirmCount = suggestions.filter((s) => s.action === "CONFIRM").length;
  const gapCount = suggestions.filter((s) => s.action === "GAP").length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analysis</h1>
        <p className="text-sm text-muted-foreground">
          {resume.contact.name || "Your resume"} against {jd.title}
          {jd.company ? ` at ${jd.company}` : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center p-6">
          <ScoreGauge score={baselineScore.total} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown categories={baselineScore.categories} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-status-good">
            <Wrench className="size-4" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{rephraseCount}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Safe rewordings ready to approve</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-status-warning">
            <MessageCircleQuestion className="size-4" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{confirmCount}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Need your confirmation</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-status-critical">
            <CircleX className="size-4" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{gapCount}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Genuine gaps — advice only</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirement coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <RequirementCoverageTable resume={resume} jd={jd} suggestions={suggestions} />
        </CardContent>
      </Card>

      <Button onClick={() => router.push("/review")} className="self-start">
        Review suggestions
      </Button>
    </main>
  );
}
