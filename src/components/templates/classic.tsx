import type { Resume } from "@/lib/types";
import { DocumentShell } from "@/components/templates/document-shell";

// Modeled on a reference "centered, serif, right-aligned meta column" layout the user
// attached. Unlike ATS-Safe/Modern/Compact, this one does NOT reuse the shared ResumeBody:
// its per-entry rows put Company/Institution and Location/Date side by side on the same
// visual line, a genuinely different structure the shared component doesn't have. That
// same-row layout is a real round-trip risk — verified empirically that puppeteer's PDF
// output extracts a flex "space-between" row as one line with a tab where the gap is
// ("Acme Corp\tAustin, TX") — so normalize.ts's buildExperience/buildEducation were
// extended to recognize and correctly split that shape (see looksLikeBulletContinuation's
// neighboring tab-handling code and its "tab-separated two-column" tests) before this
// template was added, rather than shipping a layout known to corrupt on re-upload.
//
// No "Training / Courses" or "Key Achievements" sections: the Resume domain model has no
// matching fields, and inventing empty template chrome — or worse, mislabeling a real
// `certifications` entry as a "course" — isn't something to fabricate. Certifications render
// under their own honest heading instead.
export const CLASSIC_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 44px 56px; font-size: 10.5pt; line-height: 1.5; }
  h1 { text-align: center; font-size: 22pt; letter-spacing: 0.5px; margin: 0 0 4px; }
  .contact { text-align: center; font-size: 9.5pt; color: #55534f; margin: 0 0 20px; }
  h2 { text-align: center; font-size: 12pt; font-weight: bold; letter-spacing: 0.3px; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1.5px solid #1a1a1a; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .company, .institution { color: #55534f; }
  .title, .degree { font-weight: bold; }
  .meta { color: #55534f; font-size: 9.5pt; white-space: nowrap; }
  .bullet { margin: 3px 0 4px 16px; text-indent: -12px; padding-left: 12px; }
  p { margin: 0 0 8px; }
  .entry { margin-bottom: 12px; }
`;

function contactLine(resume: Resume): string {
  const parts = [resume.contact.phone, resume.contact.email, ...resume.contact.links.map((l) => l.url), resume.contact.location].filter(
    (v): v is string => Boolean(v),
  );
  return parts.join("  •  ");
}

/** The content, separate from the DocumentShell wrapper — like ResumeBody, this is what the
 *  Redesign gallery's live iframe preview portals in directly (see registry.ts's `body`
 *  field), since a preview needs the markup without a second nested <html>/<body>. */
export function ClassicBody({ resume }: { resume: Resume }) {
  return (
    <>
      <h1>{resume.contact.name}</h1>
      <p className="contact">{contactLine(resume)}</p>

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
            <div key={exp.id} className="entry">
              <div className="row">
                <span className="company">{exp.company}</span>
                {exp.location && <span className="meta">{exp.location}</span>}
              </div>
              <div className="row">
                <span className="title">{exp.title}</span>
                <span className="meta">
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              {exp.bullets.map((bullet) => (
                <p key={bullet.id} className="bullet">
                  • {bullet.text}
                </p>
              ))}
            </div>
          ))}
        </>
      )}

      {resume.skills.length > 0 && (
        <>
          <h2>Skills</h2>
          <p>{resume.skills.map((s) => s.name).join(", ")}</p>
        </>
      )}

      {resume.certifications && resume.certifications.length > 0 && (
        <>
          <h2>Certifications</h2>
          {resume.certifications.map((cert) => (
            <p key={cert.id}>
              {cert.name}
              {cert.issuer ? ` — ${cert.issuer}` : ""}
              {cert.year ? ` (${cert.year})` : ""}
            </p>
          ))}
        </>
      )}

      {resume.education.length > 0 && (
        <>
          <h2>Education</h2>
          {resume.education.map((edu) => (
            <div key={edu.id} className="entry">
              <div className="row">
                <span className="institution">{edu.institution}</span>
              </div>
              <div className="row">
                <span className="degree">
                  {edu.degree}
                  {edu.field ? `, ${edu.field}` : ""}
                </span>
                {edu.year && <span className="meta">{edu.year}</span>}
              </div>
            </div>
          ))}
        </>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <>
          <h2>Projects</h2>
          {resume.projects.map((project) => (
            <div key={project.id} className="entry">
              <p className="title">{project.name}</p>
              <p>
                {project.description}
                {project.tech.length > 0 ? ` (${project.tech.join(", ")})` : ""}
              </p>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export function ClassicTemplate({ resume }: { resume: Resume }) {
  return (
    <DocumentShell title={resume.contact.name} styles={CLASSIC_STYLES}>
      <ClassicBody resume={resume} />
    </DocumentShell>
  );
}
