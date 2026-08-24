import { describe, expect, it } from "vitest";
import { applyApprovedSuggestions } from "@/lib/resume/apply";
import type { Resume, Suggestion } from "@/lib/types";

function makeResume(): Resume {
  return {
    id: "r1",
    version: 1,
    contact: { name: "Jane Doe", email: "jane@example.com", links: [] },
    summary: "Original summary.",
    experience: [
      {
        id: "e1",
        company: "Acme",
        title: "Engineer",
        startDate: "2020",
        endDate: "Present",
        bullets: [{ id: "b1", text: "Set up Jenkins pipelines.", isGenerated: false }],
      },
    ],
    education: [],
    skills: [{ id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true }],
    rawText: "",
    parseWarnings: [],
  };
}

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "sugg1",
    requirementId: "req1",
    requirementText: "Experience with CI/CD pipelines",
    action: "REPHRASE",
    targetSection: "experience",
    targetItemId: "b1",
    currentText: "Set up Jenkins pipelines.",
    proposedText: "Set up CI/CD pipelines with Jenkins.",
    rationale: "Buried evidence.",
    status: "APPROVED",
    ...overrides,
  };
}

describe("applyApprovedSuggestions", () => {
  it("rewrites the targeted bullet, marks it generated, and reports it as applied", () => {
    const resume = makeResume();
    const suggestion = makeSuggestion();
    const result = applyApprovedSuggestions(resume, [suggestion]);

    expect(result.resume.experience[0].bullets[0].text).toBe("Set up CI/CD pipelines with Jenkins.");
    expect(result.resume.experience[0].bullets[0].isGenerated).toBe(true);
    expect(result.resume.experience[0].bullets[0].sourceSuggestionId).toBe("sugg1");
    expect(result.applied).toEqual([suggestion]);
  });

  it("does not mutate the original resume", () => {
    const resume = makeResume();
    applyApprovedSuggestions(resume, [makeSuggestion()]);
    expect(resume.experience[0].bullets[0].text).toBe("Set up Jenkins pipelines.");
  });

  it("rewrites the summary when targetSection is summary with no targetItemId", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [
      makeSuggestion({
        targetSection: "summary",
        targetItemId: undefined,
        proposedText: "Rewritten summary with 5+ years of experience.",
      }),
    ]);
    expect(result.resume.summary).toBe("Rewritten summary with 5+ years of experience.");
    expect(result.applied).toHaveLength(1);
  });

  it("adds a new attested skill for an approved CONFIRM with user input", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [
      makeSuggestion({
        action: "CONFIRM",
        targetSection: "skills",
        targetItemId: undefined,
        currentText: undefined,
        proposedText: undefined,
        requirementText: "Proficient in Node.js development",
        userInput: "Built a Node.js service at my last job for 2 years.",
      }),
    ]);

    expect(result.resume.skills).toHaveLength(2);
    const added = result.resume.skills.find((s) => s.name === "Proficient in Node.js development");
    expect(added).toMatchObject({ category: "Confirmed", isGenerated: true, userAttested: true });
    expect(result.applied).toHaveLength(1);
  });

  it("skips a CONFIRM with no user input rather than guessing, and does not report it as applied", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [
      makeSuggestion({ action: "CONFIRM", targetSection: "skills", targetItemId: undefined, proposedText: undefined }),
    ]);
    expect(result.resume.skills).toHaveLength(1);
    expect(result.applied).toEqual([]);
  });

  it("never applies a GAP suggestion even if somehow marked APPROVED", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [
      makeSuggestion({
        action: "GAP",
        targetSection: null,
        targetItemId: undefined,
        currentText: undefined,
        proposedText: "Fabricated skill",
      }),
    ]);
    expect(result.resume).toEqual(resume);
    expect(result.applied).toEqual([]);
  });

  it("skips suggestions that are not APPROVED", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [makeSuggestion({ status: "PENDING" })]);
    expect(result.resume).toEqual(resume);
    expect(result.applied).toEqual([]);
  });

  it("ignores a REPHRASE whose targetItemId doesn't exist on this resume", () => {
    const resume = makeResume();
    const result = applyApprovedSuggestions(resume, [makeSuggestion({ targetItemId: "nonexistent" })]);
    expect(result.resume).toEqual(resume);
    expect(result.applied).toEqual([]);
  });

  it("applies multiple approved suggestions in sequence and reports both as applied", () => {
    const resume = makeResume();
    const second = makeSuggestion({
      id: "sugg2",
      targetSection: "summary",
      targetItemId: undefined,
      proposedText: "New summary.",
    });
    const result = applyApprovedSuggestions(resume, [makeSuggestion(), second]);
    expect(result.resume.experience[0].bullets[0].text).toBe("Set up CI/CD pipelines with Jenkins.");
    expect(result.resume.summary).toBe("New summary.");
    expect(result.applied.map((s) => s.id)).toEqual(["sugg1", "sugg2"]);
  });
});
