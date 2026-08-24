import { describe, expect, it } from "vitest";
import { renderResumeAsDocx } from "@/lib/export/docx";
import { parseDocx } from "@/lib/parsers/docx";
import { TEMPLATE_IDS } from "@/components/templates/registry";
import type { Resume } from "@/lib/types";

function makeResume(): Resume {
  return {
    id: "r1",
    version: 1,
    contact: {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "512-555-0182",
      location: "Austin, TX",
      links: [{ label: "LinkedIn", url: "https://linkedin.com/in/janedoe" }],
    },
    summary:
      "Results-driven software engineer with 6 years of experience building scalable web applications.",
    experience: [
      {
        id: "e1",
        company: "Acme Corp",
        title: "Senior Software Engineer",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Led migration of a monolith to microservices, cutting deploy time 40%.", isGenerated: false },
          { id: "b2", text: "Mentored 3 junior engineers on system design.", isGenerated: false },
        ],
      },
      {
        id: "e2",
        company: "Beta Inc",
        title: "Software Engineer",
        startDate: "Jun 2018",
        endDate: "Dec 2020",
        bullets: [{ id: "b3", text: "Built REST APIs serving 2 million requests per day.", isGenerated: false }],
      },
    ],
    education: [
      {
        id: "edu1",
        institution: "University of Texas",
        degree: "Bachelor of Science",
        field: "Computer Science",
        year: "2018",
      },
    ],
    skills: [
      { id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true },
      { id: "s2", name: "Kubernetes", category: "Tools", isGenerated: false, userAttested: true },
    ],
    projects: [{ id: "p1", name: "OpenTrack", description: "A self-hosted issue tracker.", tech: ["TypeScript", "Postgres"] }],
    certifications: [{ id: "c1", name: "AWS Certified Solutions Architect", issuer: "Amazon", year: "2022" }],
    rawText: "",
    parseWarnings: [],
  };
}

describe("renderResumeAsDocx round-trip", () => {
  it.each(TEMPLATE_IDS)("template '%s' re-parses into a structurally equivalent resume with no spurious parse warnings", async (templateId) => {
    const original = makeResume();
    const buffer = await renderResumeAsDocx(original, templateId);
    const reparsed = await parseDocx(buffer);

    expect(reparsed.contact.name).toBe(original.contact.name);
    expect(reparsed.contact.email).toBe(original.contact.email);

    expect(reparsed.experience).toHaveLength(2);
    expect(reparsed.experience[0].title).toBe(original.experience[0].title);
    expect(reparsed.experience[0].company).toBe(original.experience[0].company);
    expect(reparsed.experience[0].bullets.map((b) => b.text)).toEqual(
      original.experience[0].bullets.map((b) => b.text),
    );
    expect(reparsed.experience[1].bullets.map((b) => b.text)).toEqual(
      original.experience[1].bullets.map((b) => b.text),
    );

    expect(reparsed.education).toHaveLength(1);
    expect(reparsed.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["JavaScript", "Kubernetes"]));
    expect(reparsed.projects?.[0]?.name).toBe("OpenTrack");
    expect(reparsed.certifications?.[0]?.name).toBe("AWS Certified Solutions Architect");

    const badWarnings = reparsed.parseWarnings.filter((w) =>
      /no .* section detected|unrecognized section heading|multi-column|table/i.test(w),
    );
    expect(badWarnings).toEqual([]);
  });
});
