import type { Resume } from "@/lib/types";

function contactLine(resume: Resume): string {
  const parts = [resume.contact.email, resume.contact.phone, resume.contact.location].filter(
    (v): v is string => Boolean(v),
  );
  return [...parts, ...resume.contact.links.map((l) => l.url)].join(" | ");
}

/** Plain-text ATS-safe export (spec §6 screen 4). No styling, no columns, no special
 *  characters beyond a plain "-" bullet — the format a resume-screening tool with the
 *  crudest possible text extraction still reads correctly. */
export function renderResumeAsTxt(resume: Resume): string {
  const lines: string[] = [resume.contact.name];

  const contact = contactLine(resume);
  if (contact) lines.push(contact);
  lines.push("");

  if (resume.summary) {
    lines.push("SUMMARY", resume.summary, "");
  }

  if (resume.experience.length > 0) {
    lines.push("EXPERIENCE");
    for (const exp of resume.experience) {
      lines.push(`${exp.company}, ${exp.title} (${exp.startDate} - ${exp.endDate})`);
      for (const bullet of exp.bullets) lines.push(`- ${bullet.text}`);
      lines.push("");
    }
  }

  if (resume.education.length > 0) {
    lines.push("EDUCATION");
    for (const edu of resume.education) {
      // Institution first — matches buildEducation()'s "Institution, Degree" parsing
      // convention (same fix as Company/Title order in Experience, phase 8).
      lines.push(
        `${edu.institution}, ${edu.degree}${edu.field ? `, ${edu.field}` : ""}${edu.year ? ` (${edu.year})` : ""}`,
      );
    }
    lines.push("");
  }

  if (resume.skills.length > 0) {
    lines.push("SKILLS", resume.skills.map((s) => s.name).join(", "), "");
  }

  if (resume.projects && resume.projects.length > 0) {
    lines.push("PROJECTS");
    for (const project of resume.projects) {
      const suffix = project.tech.length > 0 ? ` (${project.tech.join(", ")})` : "";
      lines.push(project.name, `${project.description}${suffix}`);
    }
    lines.push("");
  }

  if (resume.certifications && resume.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    for (const cert of resume.certifications) {
      lines.push(`${cert.name}${cert.issuer ? `, ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`);
    }
  }

  return lines.join("\n").trim() + "\n";
}
