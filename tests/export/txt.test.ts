import { describe, expect, it } from "vitest";
import { renderResumeAsTxt } from "@/lib/export/txt";
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
    summary: "Results-driven software engineer with 6 years of experience.",
    experience: [
      {
        id: "e1",
        company: "Acme Corp",
        title: "Senior Software Engineer",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [{ id: "b1", text: "Led migration of a monolith to microservices.", isGenerated: false }],
      },
    ],
    education: [{ id: "edu1", institution: "University of Texas", degree: "Bachelor of Science", year: "2018" }],
    skills: [{ id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true }],
    projects: [{ id: "p1", name: "OpenTrack", description: "A self-hosted issue tracker.", tech: ["TypeScript"] }],
    certifications: [{ id: "c1", name: "AWS Certified Solutions Architect", issuer: "Amazon", year: "2022" }],
    rawText: "",
    parseWarnings: [],
  };
}

describe("renderResumeAsTxt", () => {
  it("includes every section's content as plain text", () => {
    const resume = makeResume();
    const txt = renderResumeAsTxt(resume);

    expect(txt).toContain(resume.contact.name);
    expect(txt).toContain(resume.contact.email);
    expect(txt).toContain(resume.summary!);
    expect(txt).toContain(resume.experience[0].company);
    expect(txt).toContain(resume.experience[0].bullets[0].text);
    expect(txt).toContain(resume.education[0].institution);
    expect(txt).toContain("JavaScript");
    expect(txt).toContain("OpenTrack");
    expect(txt).toContain("AWS Certified Solutions Architect");
  });

  it("produces plain text with no HTML markup", () => {
    const txt = renderResumeAsTxt(makeResume());
    expect(txt).not.toMatch(/<[a-z][\s\S]*>/i);
  });

  it("handles a minimal resume with only required fields", () => {
    const minimal: Resume = {
      id: "r2",
      version: 1,
      contact: { name: "John Smith", email: "john@example.com", links: [] },
      experience: [],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    };
    const txt = renderResumeAsTxt(minimal);
    expect(txt).toContain("John Smith");
    expect(txt).toContain("john@example.com");
  });
});
