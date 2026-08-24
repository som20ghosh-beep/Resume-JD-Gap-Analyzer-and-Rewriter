import { describe, expect, it } from "vitest";
import { buildResume, type RawLine } from "@/lib/parsers/normalize";

function line(text: string): RawLine {
  return { text };
}

describe("buildResume — short title-shaped lines inside Skills/Projects", () => {
  it("keeps a single-word skill as skills content, not an unrecognized heading", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Skills"),
      line("Kubernetes"),
      line("Docker"),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Kubernetes", "Docker"]));
    expect(resume.parseWarnings.some((w) => /unrecognized section heading/i.test(w))).toBe(false);
  });

  it("keeps a single-word project name as a project, not an unrecognized heading", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Projects"),
      line("Nginx"),
      line("A reverse proxy configuration toolkit."),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.projects?.[0]?.name).toBe("Nginx");
    expect(resume.projects?.[0]?.description).toContain("reverse proxy");
    expect(resume.parseWarnings.some((w) => /unrecognized section heading/i.test(w))).toBe(false);
  });

  it("still detects a genuinely unrecognized section heading outside Skills/Projects", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Career Journey"),
      line("Led a small team of engineers."),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.parseWarnings.some((w) => /unrecognized section heading.*career journey/i.test(w))).toBe(
      true,
    );
  });

  it("still transitions to a new known section (Certifications) right after Skills", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Skills"),
      line("Kubernetes"),
      line("Certifications"),
      // Includes an issuer, as the export template always does — a bare 4-word cert name
      // with no issuer/year is a separate, narrower edge case this fix doesn't address.
      line("AWS Certified Solutions Architect, Amazon"),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.skills.map((s) => s.name)).toEqual(["Kubernetes"]);
    expect(resume.certifications?.[0]?.name).toContain("AWS Certified Solutions Architect");
  });
});
