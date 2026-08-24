import type { Resume } from "@/lib/types";

function contactParts(resume: Resume): string[] {
  return [resume.contact.email, resume.contact.phone, resume.contact.location].filter(
    (v): v is string => Boolean(v),
  );
}

/** The resume's content structure, shared by every template (spec §6 screen 5: "switching
 *  templates only changes presentation; the structured content ... stays identical"). Every
 *  template styles this same markup differently rather than rebuilding it — which also means
 *  every template automatically keeps the round-trip-safe patterns already debugged for
 *  ATS-Safe in phase 8, instead of re-deriving them per template:
 *  - "Company, Title" order (buildExperience() expects company first).
 *  - Company/project-name lines split into two runs / rendered as siblings rather than one
 *    wholly-bold line, which the parser's own heading heuristic would otherwise misread as a
 *    document-level "unrecognized section" (see docx.ts).
 *  - A literal "• " prefix on bullets, not a `<ul>/<li>` CSS list marker, since puppeteer's
 *    PDF text layer doesn't capture a CSS-generated marker as extractable text.
 *  - A project's name and description as two separate lines, not one combined line.
 *  Only className hooks vary per template's own <style> block — no template may change this
 *  structure, since that's exactly the guarantee spec asks for. */
export function ResumeBody({ resume }: { resume: Resume }) {
  const contact = [...contactParts(resume), ...resume.contact.links.map((l) => l.url)];

  return (
    <>
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
    </>
  );
}
