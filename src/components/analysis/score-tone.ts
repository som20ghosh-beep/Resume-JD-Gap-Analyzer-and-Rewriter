import type { StatusTone } from "@/components/status/status-chip";

/** Shared severity thresholds for score-based visuals (gauge, category bars). A single place
 *  so the gauge, the category breakdown, and any future before/after view agree on what
 *  "good" means. */
export function scoreTone(score: number, max: number): StatusTone {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return "good";
  if (ratio >= 0.5) return "warning";
  return "critical";
}
