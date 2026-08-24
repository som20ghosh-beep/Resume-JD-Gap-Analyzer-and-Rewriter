"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReviewStore } from "@/store/review-store";
import { ScoreGauge } from "@/components/analysis/score-gauge";
import { CategoryComparison } from "@/components/analysis/category-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResultPage() {
  const router = useRouter();
  const hasApplied = useReviewStore((s) => s.hasApplied);
  const baselineScore = useReviewStore((s) => s.baselineScore);
  const newScore = useReviewStore((s) => s.newScore);
  const changelog = useReviewStore((s) => s.changelog);
  const reset = useReviewStore((s) => s.reset);

  useEffect(() => {
    if (!hasApplied) router.replace("/");
  }, [hasApplied, router]);

  if (!hasApplied || !baselineScore || !newScore) return null;

  const delta = Math.round((newScore.total - baselineScore.total) * 10) / 10;
  const changelogLines = (changelog ?? "").split("\n").filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
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
            <span className={delta >= 0 ? "text-status-good text-2xl font-semibold" : "text-status-critical text-2xl font-semibold"}>
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
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {changelogLines.map((line, i) => (
              <li key={i} className={line.startsWith("-") ? "pl-4" : "font-medium text-foreground"}>
                {line.replace(/^-\s*/, "")}
              </li>
            ))}
          </ul>
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
