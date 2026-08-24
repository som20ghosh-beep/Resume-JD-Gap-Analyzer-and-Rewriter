import type { Resume } from "@/lib/types";
import { DocumentShell } from "@/components/templates/document-shell";
import { ResumeBody } from "@/components/templates/resume-body";

// Single column, standard section headings the Phase 2 parser's own SECTION_SYNONYMS
// recognizes (Summary/Experience/Education/Skills/Projects/Certifications), no tables, no
// images, no color, no header/footer content — the ATS-Safe template's job is to score full
// marks on the formatting/parseability category by construction (spec §6 screen 5), which the
// export round-trip tests verify by re-parsing the output.
export const ATS_SAFE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111111; margin: 0; padding: 48px; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .contact { font-size: 10pt; color: #333333; margin: 0 0 18px; }
  h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #333333; margin: 18px 0 8px; padding-bottom: 3px; }
  .role { font-weight: bold; margin-bottom: 1px; }
  .role-meta { font-size: 10pt; color: #444444; margin-bottom: 5px; }
  .bullet { margin: 0 0 3px; padding-left: 20px; text-indent: -14px; }
  p { margin: 0 0 10px; }
`;

export function AtsSafeTemplate({ resume }: { resume: Resume }) {
  return (
    <DocumentShell title={resume.contact.name} styles={ATS_SAFE_STYLES}>
      <ResumeBody resume={resume} />
    </DocumentShell>
  );
}
