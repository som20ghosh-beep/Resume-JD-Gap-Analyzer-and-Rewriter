import { describe, expect, it } from "vitest";
import { computeAtsScore } from "@/lib/ats/score";
import type { JobDescription, Resume } from "@/lib/types";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

function bullet(text: string, id = `b${Math.random()}`) {
  return { id, text, isGenerated: false };
}

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: "r1",
    version: 1,
    contact: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "415-555-0100",
      location: "San Francisco, CA",
      links: [{ label: "GitHub", url: "https://github.com/janedoe" }],
    },
    summary: "Experienced engineer.",
    experience: [],
    education: [{ id: "e1", institution: "State University", degree: "B.S.", field: "Computer Science" }],
    skills: [{ id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true }],
    rawText: "",
    parseWarnings: [],
    ...overrides,
  };
}

function makeJd(overrides: Partial<JobDescription> = {}): JobDescription {
  return { id: "jd1", title: "Software Engineer", rawText: "", requirements: [], ...overrides };
}

function req(overrides: Partial<JobDescription["requirements"][number]>) {
  return {
    id: `req-${Math.random()}`,
    text: "requirement",
    type: "HARD_SKILL" as const,
    priority: "MUST_HAVE" as const,
    keywords: [],
    ...overrides,
  };
}

function categoryScore(score: ReturnType<typeof computeAtsScore>, name: string): number {
  const category = score.categories.find((c) => c.name === name);
  if (!category) throw new Error(`category not found: ${name}`);
  return category.score;
}

describe("computeAtsScore — determinism", () => {
  it("returns identical scores across repeated runs on unchanged input", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [bullet("Led migration to Kubernetes, cutting deploy time by 40%.")],
        },
      ],
      rawText: words(500),
    });
    const jd = makeJd({ requirements: [req({ keywords: ["kubernetes"] })] });

    const first = computeAtsScore(resume, jd);
    const second = computeAtsScore(resume, jd);

    expect(second.total).toBe(first.total);
    expect(second.categories).toEqual(first.categories);
    expect(second.matchedKeywords).toEqual(first.matchedKeywords);
    expect(second.missingKeywords).toEqual(first.missingKeywords);
  });
});

describe("computeAtsScore — fully empty resume (edge case)", () => {
  it("scores every category consistently with no fabricated credit", () => {
    const resume: Resume = {
      id: "r1",
      version: 1,
      contact: { name: "", email: "", links: [] },
      experience: [],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    };
    const jd = makeJd({
      requirements: [req({ keywords: ["kubernetes"] }), req({ keywords: ["react"], priority: "NICE_TO_HAVE" })],
    });

    const score = computeAtsScore(resume, jd);

    expect(categoryScore(score, "Keyword & skill match")).toBe(0);
    expect(categoryScore(score, "Section completeness")).toBe(0);
    expect(categoryScore(score, "Formatting & parseability")).toBe(20);
    expect(categoryScore(score, "Impact & quantification")).toBe(0);
    expect(categoryScore(score, "Contact & metadata")).toBe(0);
    expect(categoryScore(score, "Readability & length")).toBe(6);
    expect(score.total).toBe(26);
    expect(score.missingKeywords).toEqual(["kubernetes", "react"]);
  });
});

describe("computeAtsScore — category A: keyword & skill match", () => {
  it("weights MUST_HAVE 2x and NICE_TO_HAVE 1x", () => {
    const resume = makeResume({
      skills: [{ id: "s1", name: "Figma", category: "Design", isGenerated: false, userAttested: true }],
    });
    const jd = makeJd({
      requirements: [
        req({ keywords: ["kubernetes"], priority: "MUST_HAVE" }),
        req({ keywords: ["figma"], priority: "NICE_TO_HAVE" }),
      ],
    });

    const score = computeAtsScore(resume, jd);
    expect(categoryScore(score, "Keyword & skill match")).toBe(9.3);
    expect(score.matchedKeywords).toEqual(["figma"]);
    expect(score.missingKeywords).toEqual(["kubernetes"]);
  });

  it("caps the experience-bullet bonus and rewards full marks when matched in a bullet", () => {
    const resume = makeResume({
      skills: [],
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [bullet("Operated a production Kubernetes cluster.")],
        },
      ],
    });
    const jd = makeJd({ requirements: [req({ keywords: ["kubernetes"], priority: "MUST_HAVE" })] });

    const score = computeAtsScore(resume, jd);
    expect(categoryScore(score, "Keyword & skill match")).toBe(35);
  });

  it("scores 0 with a finding when the JD has no extracted requirements", () => {
    const score = computeAtsScore(makeResume(), makeJd({ requirements: [] }));
    const category = score.categories.find((c) => c.name === "Keyword & skill match")!;
    expect(category.score).toBe(0);
    expect(category.findings[0]).toMatch(/no requirements/i);
  });
});

describe("computeAtsScore — category C: formatting & parseability", () => {
  it("deducts per detected ATS-hostile signal and surfaces the original warning text", () => {
    const resume = makeResume({
      parseWarnings: [
        "Multi-column layout detected on 2 page(s); reading order was reconstructed column-by-column and may not exactly match the original.",
        "Table-like content detected on 1 page(s); it was flattened to plain text and may need manual review.",
        'Unrecognized section heading "Volunteer Work" — its content was kept but not categorized.',
        "No email address found in the resume header.",
      ],
    });

    const score = computeAtsScore(resume, makeJd());
    const category = score.categories.find((c) => c.name === "Formatting & parseability")!;
    expect(category.score).toBe(7);
    expect(category.findings).toHaveLength(3);
    expect(category.findings).not.toContain("No email address found in the resume header.");
  });

  it("scores full marks when there are no formatting warnings", () => {
    const score = computeAtsScore(makeResume({ parseWarnings: [] }), makeJd());
    expect(categoryScore(score, "Formatting & parseability")).toBe(20);
  });
});

describe("computeAtsScore — category D: impact & quantification", () => {
  it("scores 0 with a finding when there are no experience bullets (no-experience edge case)", () => {
    const score = computeAtsScore(makeResume({ experience: [] }), makeJd());
    const category = score.categories.find((c) => c.name === "Impact & quantification")!;
    expect(category.score).toBe(0);
    expect(category.findings[0]).toMatch(/no experience bullets/i);
  });

  it("rewards action-verb + quantified bullets and penalizes pronouns/passive phrasing", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            bullet("Led migration of legacy services to Kubernetes, cutting deploy time by 40%."),
            bullet("Responsible for managing a team of 5 engineers."),
            bullet("I improved system uptime to 99.9%."),
            bullet("Improved code review turnaround by 30%."),
          ],
        },
      ],
    });

    const score = computeAtsScore(resume, makeJd());
    const category = score.categories.find((c) => c.name === "Impact & quantification")!;
    expect(category.score).toBe(8);
    expect(category.findings.some((f) => f.includes("2 of 4"))).toBe(true);
    expect(category.findings.some((f) => /first-person/i.test(f))).toBe(true);
    expect(category.findings.some((f) => /passive phrasing/i.test(f))).toBe(true);
  });
});

describe("computeAtsScore — category F: readability & length", () => {
  it("deducts when word count is below the target band", () => {
    const score = computeAtsScore(makeResume({ experience: [], summary: undefined, rawText: words(100) }), makeJd());
    expect(categoryScore(score, "Readability & length")).toBe(6);
  });

  it("uses the extended 1200-word band for 10+ years of experience", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2005",
          endDate: "Present",
          bullets: [bullet("Did steady work.")],
        },
      ],
      summary: undefined,
      rawText: words(900),
    });
    expect(categoryScore(computeAtsScore(resume, makeJd()), "Readability & length")).toBe(10);
  });

  it("flags a 3-page resume that exceeds even the extended band", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2005",
          endDate: "Present",
          bullets: [bullet("Did steady work.")],
        },
      ],
      summary: undefined,
      rawText: words(1500),
    });
    const category = computeAtsScore(resume, makeJd()).categories.find((c) => c.name === "Readability & length")!;
    expect(category.score).toBe(6);
    expect(category.findings[0]).toMatch(/1500 word/);
  });

  it("penalizes an over-long bullet", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [bullet(words(35))],
        },
      ],
      summary: undefined,
      rawText: words(500),
    });
    expect(categoryScore(computeAtsScore(resume, makeJd()), "Readability & length")).toBe(9);
  });

  it("penalizes more than 6 bullets under a single role", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: Array.from({ length: 7 }, (_, i) => bullet(`Did task ${i}.`, `b${i}`)),
        },
      ],
      summary: undefined,
      rawText: words(500),
    });
    const category = computeAtsScore(resume, makeJd()).categories.find((c) => c.name === "Readability & length")!;
    expect(category.score).toBe(9);
    expect(category.findings.some((f) => /more than 6 bullets/i.test(f))).toBe(true);
  });

  it("penalizes an over-long sentence in the summary", () => {
    const resume = makeResume({ experience: [], summary: words(45), rawText: words(500) });
    expect(categoryScore(computeAtsScore(resume, makeJd()), "Readability & length")).toBe(9);
  });
});

describe("computeAtsScore — category B & E: completeness and contact", () => {
  it("awards full marks when every section and contact field is present", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [bullet("Led a small team.")],
        },
      ],
    });
    const score = computeAtsScore(resume, makeJd());
    expect(categoryScore(score, "Section completeness")).toBe(15);
    expect(categoryScore(score, "Contact & metadata")).toBe(5);
  });
});
