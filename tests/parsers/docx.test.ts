import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocx } from "@/lib/parsers/docx";

const fixture = (name: string) =>
  readFile(path.join(import.meta.dirname, "..", "fixtures", name));

describe("parseDocx", () => {
  it("extracts a clean resume using Word heading styles and bullet lists", async () => {
    const resume = await parseDocx(await fixture("resume-standard.docx"));

    expect(resume.contact.name).toBe("Priya Nair");
    expect(resume.contact.email).toBe("priya.nair@example.com");
    expect(resume.summary).toMatch(/full-stack engineer/i);

    expect(resume.experience).toHaveLength(1);
    expect(resume.experience[0].company).toBe("Vertex Labs");
    expect(resume.experience[0].title).toBe("Platform Engineer");
    expect(resume.experience[0].bullets.length).toBeGreaterThanOrEqual(2);

    expect(resume.education).toHaveLength(1);
    expect(resume.skills.length).toBeGreaterThanOrEqual(3);
  });

  it("flags header-only contact info, a table, and a multi-column section", async () => {
    const resume = await parseDocx(await fixture("resume-docx-messy.docx"));

    expect(resume.contact.name).toBe("Sam Okafor");
    const warnings = resume.parseWarnings.join(" ");
    expect(warnings).toMatch(/header/i);
    expect(warnings).toMatch(/table/i);
    expect(warnings).toMatch(/multi-column/i);
    // Table cell content should still be captured in rawText rather than silently dropped.
    expect(resume.rawText).toMatch(/Zendesk/);
  });
});
