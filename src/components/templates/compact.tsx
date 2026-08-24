import type { Resume } from "@/lib/types";
import { DocumentShell } from "@/components/templates/document-shell";
import { ResumeBody } from "@/components/templates/resume-body";

// Same shared structure as ATS-Safe/Modern (via ResumeBody) — tighter font sizes, line
// height, and margins throughout to fit a dense history on one page (spec §6 screen 5).
export const COMPACT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111111; margin: 0; padding: 28px 34px; font-size: 9.5pt; line-height: 1.25; }
  h1 { font-size: 16pt; margin: 0 0 2px; }
  .contact { font-size: 8.5pt; color: #333333; margin: 0 0 10px; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #555555; margin: 10px 0 5px; padding-bottom: 1px; }
  .role { font-weight: bold; margin-bottom: 0; }
  .role-meta { font-size: 8.5pt; color: #555555; margin-bottom: 2px; }
  .bullet { margin: 0 0 1px; padding-left: 16px; text-indent: -12px; }
  p { margin: 0 0 5px; }
`;

export function CompactTemplate({ resume }: { resume: Resume }) {
  return (
    <DocumentShell title={resume.contact.name} styles={COMPACT_STYLES}>
      <ResumeBody resume={resume} />
    </DocumentShell>
  );
}
