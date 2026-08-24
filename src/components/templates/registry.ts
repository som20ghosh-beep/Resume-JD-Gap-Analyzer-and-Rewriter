import type { ComponentType } from "react";
import type { Resume } from "@/lib/types";
import { AtsSafeTemplate, ATS_SAFE_STYLES } from "@/components/templates/ats-safe";
import { ModernTemplate, MODERN_STYLES } from "@/components/templates/modern";
import { CompactTemplate, COMPACT_STYLES } from "@/components/templates/compact";

export type TemplateId = "ats-safe" | "modern" | "compact";

export const TEMPLATE_IDS = ["ats-safe", "modern", "compact"] as const satisfies readonly TemplateId[];

export const TEMPLATES: Record<
  TemplateId,
  {
    name: string;
    description: string;
    /** Full standalone document (DocumentShell + ResumeBody) — used for PDF export. */
    component: ComponentType<{ resume: Resume }>;
    /** Just the CSS, no wrapper — used by the gallery's live iframe preview, which supplies
     *  its own html/head/body and portals `<ResumeBody>` in directly (see iframe-preview.tsx). */
    styles: string;
  }
> = {
  "ats-safe": {
    name: "ATS-Safe",
    description:
      "Single column, standard headings, no color or graphics — built to score full marks on ATS formatting checks.",
    component: AtsSafeTemplate,
    styles: ATS_SAFE_STYLES,
  },
  modern: {
    name: "Modern",
    description: "A subtle color accent and a more refined type scale, while staying fully parseable.",
    component: ModernTemplate,
    styles: MODERN_STYLES,
  },
  compact: {
    name: "Compact",
    description: "Tighter leading and margins to fit a dense history on one page.",
    component: CompactTemplate,
    styles: COMPACT_STYLES,
  },
};
