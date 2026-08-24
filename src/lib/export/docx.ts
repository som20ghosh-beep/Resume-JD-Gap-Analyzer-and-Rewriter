import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun, type IStylesOptions } from "docx";
import type { Resume } from "@/lib/types";
import type { TemplateId } from "@/components/templates/registry";

// Cosmetic-only style overrides per template — font, color, and spacing on the built-in
// Title/Heading1 styles. The paragraph *structure* below (heading levels, run splits, bullet
// usage) never varies per template, since that structure is what the round-trip parser
// depends on — only these visual definitions change, matching the PDF templates' contract
// that switching templates changes presentation only (spec §6 screen 5).
const TEMPLATE_STYLES: Record<TemplateId, IStylesOptions> = {
  "ats-safe": {
    default: { document: { run: { font: "Arial", size: 22 } } },
  },
  modern: {
    default: {
      document: { run: { font: "Calibri", size: 21 } },
      title: { run: { color: "16425B", bold: true, size: 40 } },
      heading1: {
        run: { color: "16425B", bold: true, size: 24 },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
    },
  },
  compact: {
    default: {
      document: { run: { font: "Arial", size: 19 } },
      title: { run: { size: 32 }, paragraph: { spacing: { after: 60 } } },
      heading1: { run: { size: 20 }, paragraph: { spacing: { before: 120, after: 60 } } },
    },
  },
  classic: {
    default: {
      document: { run: { font: "Cambria", size: 21 } },
      title: {
        run: { size: 36, bold: true },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 60 } },
      },
      heading1: {
        run: { size: 24, bold: true },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 } },
      },
    },
  },
};

function contactLine(resume: Resume): string {
  const parts = [resume.contact.email, resume.contact.phone, resume.contact.location].filter(
    (v): v is string => Boolean(v),
  );
  return [...parts, ...resume.contact.links.map((l) => l.url)].join(" | ");
}

export async function renderResumeAsDocx(resume: Resume, templateId: TemplateId = "ats-safe"): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, text: resume.contact.name }),
  ];

  const contact = contactLine(resume);
  if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 20 })] }));

  if (resume.summary) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Summary" }));
    children.push(new Paragraph({ text: resume.summary }));
  }

  if (resume.experience.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Experience" }));
    for (const exp of resume.experience) {
      children.push(
        // Two runs, not one wholly-bold run: a paragraph whose entire content is a single
        // <strong> tag reads as a heading to the round-trip parser (docx.ts's isWhollyBold
        // check) and would wrongly split this entry out of the Experience section.
        new Paragraph({
          children: [
            new TextRun({ text: exp.company, bold: true }),
            new TextRun({ text: `, ${exp.title}` }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.startDate} – ${exp.endDate}${exp.location ? ` | ${exp.location}` : ""}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
      );
      for (const bullet of exp.bullets) {
        children.push(new Paragraph({ text: bullet.text, bullet: { level: 0 } }));
      }
    }
  }

  if (resume.education.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Education" }));
    for (const edu of resume.education) {
      // Institution first — matches buildEducation()'s "Institution — Degree" parsing
      // convention (same fix as Company/Title order in Experience, phase 8).
      const line = [edu.institution, `${edu.degree}${edu.field ? `, ${edu.field}` : ""}`, edu.year]
        .filter(Boolean)
        .join(" — ");
      children.push(new Paragraph({ text: line }));
    }
  }

  if (resume.skills.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Skills" }));
    children.push(new Paragraph({ text: resume.skills.map((s) => s.name).join(", ") }));
  }

  if (resume.projects && resume.projects.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Projects" }));
    for (const project of resume.projects) {
      // Name on its own plain (non-bold, non-heading) line, description on the next: the
      // round-trip parser's buildProjects() splits a new project on a short unpunctuated
      // line and folds everything after it into that project's description until the next
      // one — one combined "Name: description" line collapses into a single giant name
      // instead, and a bold name (like the experience fix above) risks a document-level
      // heading misclassification instead.
      children.push(new Paragraph({ text: project.name }));
      const suffix = project.tech.length > 0 ? ` (${project.tech.join(", ")})` : "";
      children.push(new Paragraph({ text: `${project.description}${suffix}` }));
    }
  }

  if (resume.certifications && resume.certifications.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Certifications" }));
    for (const cert of resume.certifications) {
      const line = [cert.name, cert.issuer, cert.year].filter(Boolean).join(" — ");
      children.push(new Paragraph({ text: line }));
    }
  }

  const doc = new Document({ styles: TEMPLATE_STYLES[templateId], sections: [{ children }] });
  return Packer.toBuffer(doc);
}
