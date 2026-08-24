import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import type { JobDescription, Resume, Suggestion } from "@/lib/types";
import { matchRequirements } from "@/lib/ats/keywords";
import { StatusChip, type StatusTone } from "@/components/status/status-chip";
import { Badge } from "@/components/ui/badge";

type CoverageStatus = "Met" | "Partial" | "Missing";

const STATUS_CONFIG: Record<CoverageStatus, { tone: StatusTone; icon: typeof CircleCheck }> = {
  Met: { tone: "good", icon: CircleCheck },
  Partial: { tone: "warning", icon: CircleAlert },
  Missing: { tone: "critical", icon: CircleX },
};

export function RequirementCoverageTable({
  resume,
  jd,
  suggestions,
}: {
  resume: Resume;
  jd: JobDescription;
  suggestions: Suggestion[];
}) {
  const matches = matchRequirements(resume, jd);
  const matchedIds = new Set(matches.filter((m) => m.matched).map((m) => m.requirement.id));
  const suggestionByRequirement = new Map(suggestions.map((s) => [s.requirementId, s]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Requirement</th>
            <th className="px-3 py-2 font-medium">Priority</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Evidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {jd.requirements.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                No requirements were extracted from this job description.
              </td>
            </tr>
          )}
          {jd.requirements.map((requirement) => {
            const suggestion = suggestionByRequirement.get(requirement.id);
            const status: CoverageStatus = matchedIds.has(requirement.id)
              ? "Met"
              : suggestion?.action === "REPHRASE" || suggestion?.action === "CONFIRM"
                ? "Partial"
                : "Missing";
            const { tone, icon } = STATUS_CONFIG[status];
            const evidence =
              status === "Met"
                ? "Direct keyword match"
                : status === "Partial"
                  ? suggestion?.evidence
                  : undefined;

            return (
              <tr key={requirement.id}>
                <td className="px-3 py-2 text-foreground">{requirement.text}</td>
                <td className="px-3 py-2">
                  <Badge variant={requirement.priority === "MUST_HAVE" ? "default" : "outline"}>
                    {requirement.priority === "MUST_HAVE" ? "Must have" : "Nice to have"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <StatusChip tone={tone} icon={icon} label={status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{evidence ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
