import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parsePdf } from "@/lib/parsers/pdf";
import { ParseError } from "@/lib/parsers/errors";

const fixture = (name: string) =>
  readFile(path.join(import.meta.dirname, "..", "fixtures", name));

describe("parsePdf", () => {
  it("extracts a clean single-column resume correctly", async () => {
    const resume = await parsePdf(await fixture("resume-standard.pdf"));

    expect(resume.contact.name).toBe("Jane Doe");
    expect(resume.contact.email).toBe("jane.doe@example.com");
    expect(resume.contact.phone).toBeTruthy();
    expect(resume.contact.links[0]?.label).toBe("LinkedIn");
    expect(resume.summary).toMatch(/results-driven/i);

    expect(resume.experience).toHaveLength(2);
    expect(resume.experience[0].company).toBe("Acme Corp");
    expect(resume.experience[0].title).toBe("Senior Software Engineer");
    expect(resume.experience[0].endDate).toBe("Present");
    expect(resume.experience[0].bullets.length).toBeGreaterThanOrEqual(2);

    expect(resume.education).toHaveLength(1);
    expect(resume.education[0].institution).toBe("University of Texas");

    expect(resume.skills.length).toBeGreaterThanOrEqual(6);
    expect(resume.certifications).toHaveLength(1);
  });

  it("reconstructs a two-column layout and flags it in parseWarnings", async () => {
    const resume = await parsePdf(await fixture("resume-two-column.pdf"));

    expect(resume.contact.name).toBe("John Smith");
    expect(resume.contact.email).toBe("john.smith@example.com");
    expect(resume.experience.length).toBeGreaterThanOrEqual(1);
    expect(resume.parseWarnings.some((w) => /multi-column/i.test(w))).toBe(true);
  });

  it("flags table-like content instead of silently mangling it", async () => {
    const resume = await parsePdf(await fixture("resume-table.pdf"));

    expect(resume.contact.name).toBe("Alex Rivera");
    expect(resume.parseWarnings.some((w) => /table/i.test(w))).toBe(true);
    // Table cell text should still show up somewhere rather than being dropped.
    expect(resume.rawText).toMatch(/JavaScript/);
    expect(resume.rawText).toMatch(/Kubernetes/);
  });

  it("keeps unrecognized section headings and warns instead of dropping them", async () => {
    const resume = await parsePdf(await fixture("resume-unusual-headings.pdf"));

    expect(resume.contact.name).toBe("Morgan Lee");
    const warnings = resume.parseWarnings.join(" ");
    expect(warnings).toMatch(/unrecognized section heading/i);
    expect(warnings).toMatch(/what i bring/i);
    // "Career Journey" isn't a synonym either, so experience should also be flagged unrecognized
    // rather than silently misparsed.
    expect(warnings).toMatch(/career journey/i);
  });

  it("raises a clear typed error for a scanned/no-text PDF instead of returning garbage", async () => {
    await expect(parsePdf(await fixture("resume-scanned.pdf"))).rejects.toMatchObject({
      code: "SCANNED_PDF",
    });
    await expect(parsePdf(await fixture("resume-scanned.pdf"))).rejects.toBeInstanceOf(
      ParseError,
    );
  });
});
