import { computeWordDiff } from "@/lib/resume/diff";

/** Word-level before/after diff for a REPHRASE card (spec §6 screen 3: "additions green,
 *  deletions struck red"; spec §10 phase 10: "ARIA on the diff cards"). Each span carries a
 *  background wash alongside the hue, not color alone, so the change reads even without
 *  color vision — and `<ins>`/`<del>` (not `<span>`) are the semantically correct elements
 *  for tracked changes. The container's `aria-label` gives screen readers the plain-language
 *  summary instead of reading through each inline segment node by node. */
export function DiffView({ before, after }: { before: string; after: string }) {
  const segments = computeWordDiff(before, after);

  return (
    <p
      className="text-sm leading-relaxed whitespace-pre-wrap"
      aria-label={`Changed from "${before}" to "${after}"`}
    >
      {segments.map((segment, i) => {
        if (segment.type === "equal") {
          return <span key={i}>{segment.text}</span>;
        }
        if (segment.type === "insert") {
          return (
            <ins key={i} className="rounded-sm bg-status-good/15 text-delta-good-text no-underline">
              {segment.text}
            </ins>
          );
        }
        return (
          <del key={i} className="rounded-sm bg-status-critical/10 text-status-critical">
            {segment.text}
          </del>
        );
      })}
    </p>
  );
}
