"use client";

import { useMemo } from "react";
import { useReviewStore } from "@/store/review-store";
import { applyApprovedSuggestions } from "@/lib/resume/apply";
import { computeAtsScore } from "@/lib/ats/score";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Recomputes the ATS score against a hypothetical resume with only the currently APPROVED
 *  suggestions applied — entirely client-side (computeAtsScore/applyApprovedSuggestions are
 *  pure, no server dependency) so it updates the instant a card is toggled, no round trip
 *  (spec §6 screen 3: "a live 'projected score' recalculates as items are toggled"). */
export function ProjectedScoreBar() {
  const resume = useReviewStore((s) => s.resume);
  const jd = useReviewStore((s) => s.jd);
  const suggestions = useReviewStore((s) => s.suggestions);
  const baselineScore = useReviewStore((s) => s.baselineScore);
  const approveAllRephrase = useReviewStore((s) => s.approveAllRephrase);

  const projectedTotal = useMemo(() => {
    if (!resume || !jd) return null;
    const approved = suggestions.filter((s) => s.status === "APPROVED");
    const { resume: preview } = applyApprovedSuggestions(resume, approved);
    return computeAtsScore(preview, jd).total;
  }, [resume, jd, suggestions]);

  if (projectedTotal === null || !baselineScore) return null;

  const delta = Math.round((projectedTotal - baselineScore.total) * 10) / 10;
  const approvedCount = suggestions.filter((s) => s.status === "APPROVED").length;
  const pendingRephraseCount = suggestions.filter((s) => s.action === "REPHRASE" && s.status === "PENDING").length;

  return (
    <div className="sticky top-0 z-10 -mx-8 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-8 py-3 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground">Projected score</span>
        <span className="text-2xl font-semibold text-foreground">{Math.round(projectedTotal)}</span>
        {delta !== 0 && (
          <span
            className={cn("text-sm font-medium", delta > 0 ? "text-status-good" : "text-status-critical")}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        <span className="text-xs text-muted-foreground">({approvedCount} approved)</span>
      </div>
      {pendingRephraseCount > 0 && (
        <Button size="sm" variant="outline" onClick={approveAllRephrase}>
          Approve all rephrase ({pendingRephraseCount})
        </Button>
      )}
    </div>
  );
}
