import { describe, expect, it } from "vitest";
import { renderResumeAsPdf } from "@/lib/export/pdf";
import { parsePdf } from "@/lib/parsers/pdf";
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
    ],
    education: [
      { id: "edu1", institution: "University of Texas", degree: "Bachelor of Science", field: "Computer Science", year: "2018" },
    ],
    skills: [
      { id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true },
      { id: "s2", name: "Kubernetes", category: "Tools", isGenerated: false, userAttested: true },
    ],
    projects: [{ id: "p1", name: "OpenTrack", description: "A self-hosted issue tracker.", tech: ["TypeScript"] }],
    certifications: [{ id: "c1", name: "AWS Certified Solutions Architect", issuer: "Amazon", year: "2022" }],
    rawText: "",
    parseWarnings: [],
  };
}

describe("renderResumeAsPdf round-trip", () => {
  it(
    "re-parses into a structurally equivalent resume with no formatting-hostile signals",
    async () => {
      const original = makeResume();
      const buffer = await renderResumeAsPdf(original);
      const reparsed = await parsePdf(buffer);

      expect(reparsed.contact.email).toBe(original.contact.email);
      expect(reparsed.experience).toHaveLength(1);
      expect(reparsed.experience[0].company).toBe(original.experience[0].company);
      expect(reparsed.experience[0].title).toBe(original.experience[0].title);

      for (const bullet of original.experience[0].bullets) {
        expect(reparsed.rawText).toContain(bullet.text);
      }

      expect(reparsed.education).toHaveLength(1);
      expect(reparsed.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["JavaScript", "Kubernetes"]));
      expect(reparsed.projects?.[0]?.name).toBe("OpenTrack");

      // The ATS-Safe template must score full marks on formatting: no multi-column/table
      // detection, single-column reading order.
      const hostileWarnings = reparsed.parseWarnings.filter((w) => /multi-column|table/i.test(w));
      expect(hostileWarnings).toEqual([]);
    },
    30000,
  );
});
