"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AtsCategory } from "@/lib/types";
import { scoreTone } from "@/components/analysis/score-tone";
import { cn } from "@/lib/utils";

const TONE_BG: Record<string, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
};

function CategoryRow({ category }: { category: AtsCategory }) {
  const [open, setOpen] = useState(false);
  const tone = scoreTone(category.score, category.max);
  const pct = category.max > 0 ? (category.score / category.max) * 100 : 0;
  const hasFindings = category.findings.length > 0;

  return (
    <div className="py-3">
      <button
        type="button"
        onClick={() => hasFindings && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 text-left",
          hasFindings ? "cursor-pointer" : "cursor-default",
        )}
        aria-expanded={open}
        disabled={!hasFindings}
      >
        <span className="w-44 shrink-0 text-sm text-foreground">{category.name}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span
            className={cn("block h-full rounded-full transition-all duration-300", TONE_BG[tone])}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {category.score}/{category.max}
        </span>
        {hasFindings && (
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        )}
      </button>
      {open && hasFindings && (
        <ul className="mt-2 ml-44 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {category.findings.map((finding, i) => (
            <li key={i}>{finding}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CategoryBreakdown({ categories }: { categories: AtsCategory[] }) {
  return (
    <div className="divide-y divide-border">
      {categories.map((category) => (
        <CategoryRow key={category.name} category={category} />
      ))}
    </div>
  );
}
