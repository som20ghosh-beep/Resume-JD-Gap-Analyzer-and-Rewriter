import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "good" | "warning" | "critical";

const TONE_BG: Record<StatusTone, string> = {
  good: "bg-status-good/10",
  warning: "bg-status-warning/15",
  critical: "bg-status-critical/10",
};

const TONE_ICON: Record<StatusTone, string> = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

/** Status is always icon + label, never color alone: the status hues are sub-4.5:1 text
 *  contrast in at least one mode (dataviz skill palette), so the hue lives on the icon and
 *  the tinted background wash only — label text stays in normal foreground ink, which is
 *  always legible, per "text never wears the data color." */
export function StatusChip({
  tone,
  icon: Icon,
  label,
  className,
}: {
  tone: StatusTone;
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground",
        TONE_BG[tone],
        className,
      )}
    >
      <Icon className={cn("size-3", TONE_ICON[tone])} aria-hidden="true" />
      {label}
    </span>
  );
}
