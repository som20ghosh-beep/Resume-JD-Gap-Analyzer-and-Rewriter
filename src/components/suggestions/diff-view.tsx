import { computeWordDiff } from "@/lib/resume/diff";

/** Word-level before/after diff for a REPHRASE card (spec §6 screen 3: "additions green,
 *  deletions struck red"). Each span carries a background wash + strikethrough alongside the
 *  hue, not color alone, so the change reads even without color vision. */
export function DiffView({ before, after }: { before: string; after: string }) {
  const segments = computeWordDiff(before, after);

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, i) => {
        if (segment.type === "equal") {
          return <span key={i}>{segment.text}</span>;
        }
        if (segment.type === "insert") {
          return (
            <span key={i} className="rounded-sm bg-status-good/15 text-status-good">
              {segment.text}
            </span>
          );
        }
        return (
          <span key={i} className="rounded-sm bg-status-critical/10 text-status-critical line-through">
            {segment.text}
          </span>
        );
      })}
    </p>
  );
}
