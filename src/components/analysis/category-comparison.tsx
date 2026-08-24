import type { AtsCategory } from "@/lib/types";
import { scoreTone } from "@/components/analysis/score-tone";
import { cn } from "@/lib/utils";

const TONE_BG: Record<string, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Before/after per category (spec §6 screen 4: "a per-category comparison"). The before
 *  value renders as a muted ghost bar under the after bar — a single shared 0–max scale per
 *  row, not a dual-axis chart, so "improved vs regressed" reads directly off one meter per
 *  category rather than needing two charts side by side. */
export function CategoryComparison({ before, after }: { before: AtsCategory[]; after: AtsCategory[] }) {
  return (
    <div className="divide-y divide-border">
      {after.map((afterCat) => {
        const beforeCat = before.find((c) => c.name === afterCat.name);
        const beforeScore = beforeCat?.score ?? 0;
        const delta = round1(afterCat.score - beforeScore);
        const max = afterCat.max;
        const tone = scoreTone(afterCat.score, max);

        return (
          <div key={afterCat.name} className="py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">{afterCat.name}</span>
              <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                {beforeScore} → {afterCat.score}/{max}
                {delta !== 0 && (
                  <span className={cn("font-medium", delta > 0 ? "text-status-good" : "text-status-critical")}>
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                )}
              </span>
            </div>
            <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/30"
                style={{ width: `${max > 0 ? (beforeScore / max) * 100 : 0}%` }}
              />
              <span
                className={cn("absolute inset-y-0 left-0 rounded-full opacity-90 transition-all duration-300", TONE_BG[tone])}
                style={{ width: `${max > 0 ? (afterCat.score / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
