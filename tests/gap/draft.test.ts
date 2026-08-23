import { describe, expect, it } from "vitest";
import { draftSuggestions } from "@/lib/gap/draft";
import type { JobDescription, Resume } from "@/lib/types";

describe("draftSuggestions", () => {
  it("returns no suggestions and never calls the LLM when every requirement is already matched", async () => {
    const resume: Resume = {
      id: "r1",
      version: 1,
      contact: { name: "Jane", email: "jane@example.com", links: [] },
      summary: "",
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [{ id: "b1", text: "Operated a production Kubernetes cluster.", isGenerated: false }],
        },
      ],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    };
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [
        {
          id: "req1",
          text: "Experience with Kubernetes",
          type: "HARD_SKILL",
          priority: "MUST_HAVE",
          keywords: ["kubernetes"],
        },
      ],
    };

    // No GROQ_API_KEY is set for the test env, so if this reached the LLM call it would throw
    // MISSING_API_KEY — reaching the assertion below instead proves the short-circuit worked.
    const suggestions = await draftSuggestions(resume, jd);
    expect(suggestions).toEqual([]);
  });

  it("returns no suggestions when the JD has no requirements at all", async () => {
    const resume: Resume = {
      id: "r1",
      version: 1,
      contact: { name: "Jane", email: "jane@example.com", links: [] },
      experience: [],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    };
    const jd: JobDescription = { id: "jd1", title: "Engineer", rawText: "", requirements: [] };

    const suggestions = await draftSuggestions(resume, jd);
    expect(suggestions).toEqual([]);
  });
});
