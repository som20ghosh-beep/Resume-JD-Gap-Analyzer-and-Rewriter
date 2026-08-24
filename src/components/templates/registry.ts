import type { ComponentType } from "react";
import type { Resume } from "@/lib/types";
import { AtsSafeTemplate, ATS_SAFE_STYLES } from "@/components/templates/ats-safe";
import { ModernTemplate, MODERN_STYLES } from "@/components/templates/modern";
import { CompactTemplate, COMPACT_STYLES } from "@/components/templates/compact";
import { ClassicTemplate, ClassicBody, CLASSIC_STYLES } from "@/components/templates/classic";
import { ResumeBody } from "@/components/templates/resume-body";

export type TemplateId = "ats-safe" | "modern" | "compact" | "classic";

export const TEMPLATE_IDS = [
  "ats-safe",
  "modern",
  "compact",
  "classic",
] as const satisfies readonly TemplateId[];

export const TEMPLATES: Record<
  TemplateId,
  {
    name: string;
    description: string;
    /** Full standalone document (DocumentShell + body) — used for PDF export. */
    component: ComponentType<{ resume: Resume }>;
    /** Just the content, no DocumentShell wrapper — used by the gallery's live iframe
     *  preview, which supplies its own html/head/body and portals this in directly (see
     *  iframe-preview.tsx). Must match `component`'s inner markup exactly, since `styles`
     *  is written against it — Classic's structure differs from the other three's shared
     *  ResumeBody, so it needs its own. */
    body: ComponentType<{ resume: Resume }>;
    styles: string;
  }
> = {
  "ats-safe": {
    name: "ATS-Safe",
    description:
      "Single column, standard headings, no color or graphics — built to score full marks on ATS formatting checks.",
    component: AtsSafeTemplate,
    body: ResumeBody,
    styles: ATS_SAFE_STYLES,
  },
  modern: {
    name: "Modern",
    description: "A subtle color accent and a more refined type scale, while staying fully parseable.",
    component: ModernTemplate,
    body: ResumeBody,
    styles: MODERN_STYLES,
  },
  compact: {
    name: "Compact",
    description: "Tighter leading and margins to fit a dense history on one page.",
    component: CompactTemplate,
    body: ResumeBody,
    styles: COMPACT_STYLES,
  },
  classic: {
    name: "Classic",
    description: "Centered serif headings with a right-aligned location/date column for an elegant, editorial look.",
    component: ClassicTemplate,
    body: ClassicBody,
    styles: CLASSIC_STYLES,
  },
};
