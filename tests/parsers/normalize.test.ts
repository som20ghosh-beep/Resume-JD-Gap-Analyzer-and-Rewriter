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

describe("buildResume — word-wrapped PDF bullets", () => {
  // Reproduces a real bug report: a long bullet that word-wraps to multiple physical lines
  // in a PDF (pdf-parse has no notion that a wrapped line is still part of the previous
  // bulleted paragraph the way DOCX's <li> does — see looksLikeBulletContinuation's doc
  // comment). Before the fix, each wrapped fragment became its own bogus experience entry:
  // empty company, the fragment as "title", default startDate ""/endDate "Present" — visibly
  // a fake bold line followed by a stray "– Present", and the real bullet text scattered
  // across several entries instead of staying together under the real job.
  it("reassembles a bullet that wraps across three physical lines, and still separates the next real job", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Experience"),
      line("Guru.com | QA Lead"),
      line("August 2021 – Present"),
      line(
        "• Owned end-to-end QA strategy for a high-traffic freelance marketplace, establishing shift-left testing from",
      ),
      line("requirements"),
      line("review through release sign-off."),
      line(
        "• Developed, maintained, and executed automated test scripts within a Selenium-Java-TestNG framework, reducing repetitive regression effort by",
      ),
      line("approximately 40%, enabling greater focus on exploratory testing."),
      line("Guru.com | Senior QA Engineer"),
      line("July 2018 – August 2021"),
      line("• Delivered full-cycle smoke, regression, UAT, and integration testing across web and mobile platforms."),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.experience).toHaveLength(2);

    const [first, second] = resume.experience;
    expect(first.company).toBe("Guru.com");
    expect(first.title).toBe("QA Lead");
    expect(first.startDate).toBe("August 2021");
    expect(first.bullets).toHaveLength(2);
    expect(first.bullets[0].text).toBe(
      "Owned end-to-end QA strategy for a high-traffic freelance marketplace, establishing shift-left testing from requirements review through release sign-off.",
    );
    expect(first.bullets[1].text).toBe(
      "Developed, maintained, and executed automated test scripts within a Selenium-Java-TestNG framework, reducing repetitive regression effort by approximately 40%, enabling greater focus on exploratory testing.",
    );

    expect(second.company).toBe("Guru.com");
    expect(second.title).toBe("Senior QA Engineer");
    expect(second.startDate).toBe("July 2018");
    expect(second.bullets).toHaveLength(1);

    // No bogus entry ever had the default startDate ""/endDate "Present" shape.
    for (const exp of resume.experience) {
      expect(exp.startDate).not.toBe("");
    }
  });
});

describe("buildResume — education with a standalone date-range line", () => {
  // Reproduces a second real bug from the same report: "Institution | Degree" on one line,
  // then a bare "2008 – 2012" attendance-dates line on the next. Before the fix this created
  // a bogus second education entry with institution "– 2012" (the leftover after a
  // non-global year regex only stripped the first year of the pair) — and a later
  // "Institution | 2006 – 2008" line (both parts on one line) had the same dangling-second-
  // year problem corrupt its institution/degree split too.
  it("attaches a bare date-range line to the preceding entry instead of creating a bogus one", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Education"),
      line("Bangalore Institute of Technology | Bachelor's Degree, Electrical Engineering"),
      line("2008 – 2012"),
      line("Chinamaya Vidyalaya | 2006 – 2008"),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.education).toHaveLength(2);
    expect(resume.education[0]).toMatchObject({
      institution: "Bangalore Institute of Technology",
      degree: "Bachelor's Degree, Electrical Engineering",
      year: "2012",
    });
    expect(resume.education[1]).toMatchObject({
      institution: "Chinamaya Vidyalaya",
      year: "2008",
    });
  });
});

describe("buildResume — CERTIFICATION (singular) section heading", () => {
  it("recognizes the singular form, not just 'certifications'", () => {
    const lines: RawLine[] = [
      line("Jane Doe"),
      line("jane@example.com"),
      line("Certification"),
      line("ISTQB Certified Tester, Foundation Level"),
    ];
    const resume = buildResume(lines, lines.map((l) => l.text).join("\n"));

    expect(resume.certifications?.[0]?.name).toBe("ISTQB Certified Tester");
    expect(resume.parseWarnings.some((w) => /unrecognized section heading/i.test(w))).toBe(false);
  });
});
