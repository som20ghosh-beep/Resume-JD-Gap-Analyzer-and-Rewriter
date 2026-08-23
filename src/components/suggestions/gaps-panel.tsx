import { CircleX } from "lucide-react";
import type { Suggestion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Spec §3.1: GAP items get their own panel, separate from the approvable suggestion list,
 *  and never carry an "Add to resume" action anywhere — this component has no buttons at all. */
export function GapsPanel({ gaps }: { gaps: Suggestion[] }) {
  if (gaps.length === 0) return null;

  return (
    <Card className="border-status-critical/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleX className="size-4 text-status-critical" aria-hidden="true" />
          Genuine gaps
        </CardTitle>
        <CardDescription>
          Advice only — nothing here is added to your resume. Close these before reapplying if you can.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.map((gap) => (
          <div key={gap.id} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">{gap.requirementText}</p>
            <p className="mt-1 text-sm text-muted-foreground">{gap.rationale}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
