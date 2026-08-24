import type { Resume } from "@/lib/types";

// Single column, standard section headings the Phase 2 parser's own SECTION_SYNONYMS
// recognizes (Summary/Experience/Education/Skills/Projects/Certifications), no tables, no
// images, no header/footer content — the ATS-Safe template's job is to score full marks on
// the formatting/parseability category by construction (spec §6 screen 5), which the export
// round-trip test (tests/export/pdf.test.ts, docx.test.ts) verifies by re-parsing the output.
const ATS_SAFE_STYLES = `
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

function contactParts(resume: Resume): string[] {
  return [resume.contact.email, resume.contact.phone, resume.contact.location].filter(
    (v): v is string => Boolean(v),
  );
}

export function AtsSafeTemplate({ resume }: { resume: Resume }) {
  const contact = [...contactParts(resume), ...resume.contact.links.map((l) => l.url)];

  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element -- standalone document rendered
          via renderToStaticMarkup for puppeteer, never mounted as a Next.js page; next/head
          doesn't apply outside the page-rendering pipeline. */}
      <head>
        <meta charSet="utf-8" />
        <title>{resume.contact.name}</title>
        <style dangerouslySetInnerHTML={{ __html: ATS_SAFE_STYLES }} />
      </head>
      <body>
        <h1>{resume.contact.name}</h1>
        {contact.length > 0 && <p className="contact">{contact.join(" | ")}</p>}

        {resume.summary && (
          <>
            <h2>Summary</h2>
            <p>{resume.summary}</p>
          </>
        )}

        {resume.experience.length > 0 && (
          <>
            <h2>Experience</h2>
            {resume.experience.map((exp) => (
              <div key={exp.id}>
                <p className="role">
                  {exp.company}, {exp.title}
                </p>
                <p className="role-meta">
                  {exp.startDate} – {exp.endDate}
                  {exp.location ? ` | ${exp.location}` : ""}
                </p>
                {exp.bullets.map((bullet) => (
                  // A literal "• " prefix in the text, not a <ul>/<li> with a CSS list
                  // marker: puppeteer's PDF text layer doesn't include CSS-generated bullet
                  // glyphs as extractable text, so the round-trip parser's isBulletLine()
                  // (which needs a literal bullet character) would never match a <li>.
                  <p key={bullet.id} className="bullet">
                    • {bullet.text}
                  </p>
                ))}
              </div>
            ))}
          </>
        )}

        {resume.education.length > 0 && (
          <>
            <h2>Education</h2>
            {resume.education.map((edu) => (
              <p key={edu.id}>
                {edu.degree}
                {edu.field ? `, ${edu.field}` : ""}, {edu.institution}
                {edu.year ? ` (${edu.year})` : ""}
              </p>
            ))}
          </>
        )}

        {resume.skills.length > 0 && (
          <>
            <h2>Skills</h2>
            <p>{resume.skills.map((s) => s.name).join(", ")}</p>
          </>
        )}

        {resume.projects && resume.projects.length > 0 && (
          <>
            <h2>Projects</h2>
            {resume.projects.map((project) => (
              // Name and description as two separate paragraphs, not one combined "Name:
              // description" line — the round-trip parser's buildProjects() splits a new
              // project on a short standalone line and treats a combined line as one giant
              // project name instead (see the docx.ts export for the same fix).
              <div key={project.id}>
                <p className="role">{project.name}</p>
                <p>
                  {project.description}
                  {project.tech.length > 0 ? ` (${project.tech.join(", ")})` : ""}
                </p>
              </div>
            ))}
          </>
        )}

        {resume.certifications && resume.certifications.length > 0 && (
          <>
            <h2>Certifications</h2>
            {resume.certifications.map((cert) => (
              <p key={cert.id}>
                {cert.name}
                {cert.issuer ? `, ${cert.issuer}` : ""}
                {cert.year ? ` (${cert.year})` : ""}
              </p>
            ))}
          </>
        )}
      </body>
    </html>
  );
}
