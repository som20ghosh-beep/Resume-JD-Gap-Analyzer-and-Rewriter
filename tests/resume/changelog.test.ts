import { describe, expect, it } from "vitest";
import { generateChangelog } from "@/lib/resume/changelog";
import type { Suggestion } from "@/lib/types";

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
    rationale: "Bullet shows Jenkins pipelines, which are CI/CD pipelines.",
    status: "APPROVED",
    ...overrides,
  };
}

describe("generateChangelog", () => {
  it("returns a no-changes message for an empty list", () => {
    expect(generateChangelog([])).toBe("No changes applied.");
  });

  it("describes a REPHRASE with its rationale", () => {
    const changelog = generateChangelog([makeSuggestion()]);
    expect(changelog).toContain("Applied 1 suggestion:");
    expect(changelog).toContain('Rephrased to address "Experience with CI/CD pipelines"');
    expect(changelog).toContain("Jenkins pipelines, which are CI/CD pipelines");
  });

  it("describes a CONFIRM with the user's verbatim input, never inventing wording", () => {
    const changelog = generateChangelog([
      makeSuggestion({
        action: "CONFIRM",
        requirementText: "Proficient in Node.js development",
        userInput: "Built a Node.js service at my last job for 2 years.",
        currentText: undefined,
        proposedText: undefined,
      }),
    ]);
    expect(changelog).toContain('Added confirmed skill "Proficient in Node.js development"');
    expect(changelog).toContain("Built a Node.js service at my last job for 2 years.");
  });

  it("pluralizes the count correctly for multiple changes", () => {
    const changelog = generateChangelog([makeSuggestion({ id: "a" }), makeSuggestion({ id: "b" })]);
    expect(changelog).toContain("Applied 2 suggestions:");
  });
});
