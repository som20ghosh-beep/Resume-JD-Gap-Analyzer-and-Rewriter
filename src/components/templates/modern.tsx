import type { Resume } from "@/lib/types";
import { DocumentShell } from "@/components/templates/document-shell";
import { ResumeBody } from "@/components/templates/resume-body";

// Same single-column, no-table/no-image structure as ATS-Safe (via the shared ResumeBody) —
// only the stylesheet differs, so this scores identically on formatting/parseability (spec
// §6 screen 5: "Still fully parseable"). The color accent lives entirely on the existing
// .contact rule (a border) rather than any template-specific markup, so ResumeBody stays
// universal across all three templates.
export const MODERN_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 52px 56px; font-size: 10.5pt; line-height: 1.5; }
  h1 { font-size: 27pt; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 6px; color: #16425b; }
  .contact { font-size: 9.5pt; color: #5a6570; margin: 0 0 20px; padding-bottom: 14px; border-bottom: 2px solid #2a8c82; }
  h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #16425b; margin: 20px 0 10px; }
  .role { font-weight: 600; margin-bottom: 1px; }
  .role-meta { font-size: 9.5pt; color: #6b7280; margin-bottom: 6px; font-style: italic; }
  .bullet { margin: 0 0 4px; padding-left: 18px; text-indent: -14px; }
  p { margin: 0 0 10px; }
`;

export function ModernTemplate({ resume }: { resume: Resume }) {
  return (
    <DocumentShell title={resume.contact.name} styles={MODERN_STYLES}>
      <ResumeBody resume={resume} />
    </DocumentShell>
  );
}
