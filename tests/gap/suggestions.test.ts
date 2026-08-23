import { describe, expect, it } from "vitest";
import { buildSuggestionsFromDraft, collectValidItemIds } from "@/lib/gap/suggestions";
import type { SuggestionDraftItem } from "@/lib/llm/schemas";
import type { Requirement, Resume } from "@/lib/types";

function req(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req1",
    text: "Experience with Kubernetes",
    type: "HARD_SKILL",
    priority: "MUST_HAVE",
    keywords: ["kubernetes"],
    ...overrides,
  };
}

function draft(overrides: Partial<SuggestionDraftItem> = {}): SuggestionDraftItem {
  return {
    requirementId: "req1",
    action: "REPHRASE",
    targetSection: "experience",
    targetItemId: "bullet1",
    currentText: "Set up Jenkins pipelines",
    proposedText: "Set up CI/CD pipelines with Jenkins",
    rationale: "The resume already describes CI/CD work under a different name.",
    evidence: "Set up Jenkins pipelines",
    ...overrides,
  };
}

describe("collectValidItemIds", () => {
  it("collects ids from bullets, skills, projects, and certifications but not education", () => {
    const resume: Resume = {
      id: "r1",
      version: 1,
      contact: { name: "Jane", email: "jane@example.com", links: [] },
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [{ id: "bullet1", text: "Did work.", isGenerated: false }],
        },
      ],
      education: [{ id: "edu1", institution: "U", degree: "B.S." }],
      skills: [{ id: "skill1", name: "Python", category: "Languages", isGenerated: false, userAttested: true }],
      projects: [{ id: "proj1", name: "Thing", description: "A thing", tech: [] }],
      certifications: [{ id: "cert1", name: "AWS SAA" }],
      rawText: "",
      parseWarnings: [],
    };

    const ids = collectValidItemIds(resume);
    expect(ids.has("bullet1")).toBe(true);
    expect(ids.has("skill1")).toBe(true);
    expect(ids.has("proj1")).toBe(true);
    expect(ids.has("cert1")).toBe(true);
    expect(ids.has("edu1")).toBe(false);
  });
});

describe("buildSuggestionsFromDraft", () => {
  it("keeps a well-formed REPHRASE suggestion intact", () => {
    const result = buildSuggestionsFromDraft([req()], [draft()], new Set(["bullet1"]));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      requirementId: "req1",
      action: "REPHRASE",
      targetItemId: "bullet1",
      currentText: "Set up Jenkins pipelines",
      proposedText: "Set up CI/CD pipelines with Jenkins",
      status: "PENDING",
    });
  });

  it("drops a REPHRASE with no proposedText rather than producing an empty edit", () => {
    const result = buildSuggestionsFromDraft(
      [req()],
      [draft({ proposedText: null })],
      new Set(["bullet1"]),
    );
    expect(result).toHaveLength(0);
  });

  it("strips resume-editing fields from a GAP suggestion even if the model filled them in", () => {
    const result = buildSuggestionsFromDraft(
      [req()],
      [
        draft({
          action: "GAP",
          targetSection: "skills",
          targetItemId: "bullet1",
          currentText: "something",
          proposedText: "Kubernetes",
          rationale: "No evidence of container orchestration anywhere on the resume.",
        }),
      ],
      new Set(["bullet1"]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("GAP");
    expect(result[0].targetSection).toBeNull();
    expect(result[0].targetItemId).toBeUndefined();
    expect(result[0].currentText).toBeUndefined();
    expect(result[0].proposedText).toBeUndefined();
  });

  it("strips proposedText from a CONFIRM suggestion even if the model filled it in", () => {
    const result = buildSuggestionsFromDraft(
      [req()],
      [
        draft({
          action: "CONFIRM",
          targetSection: "skills",
          currentText: null,
          proposedText: "Kubernetes",
          rationale: "Docker experience is adjacent but Kubernetes itself isn't evidenced.",
        }),
      ],
      new Set(["bullet1"]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("CONFIRM");
    expect(result[0].proposedText).toBeUndefined();
  });

  it("nulls out a targetItemId that doesn't exist on the resume", () => {
    const result = buildSuggestionsFromDraft(
      [req()],
      [draft({ targetItemId: "hallucinated-id" })],
      new Set(["bullet1"]),
    );
    expect(result[0].targetItemId).toBeUndefined();
  });

  it("drops a draft whose requirementId doesn't match any given requirement", () => {
    const result = buildSuggestionsFromDraft([req()], [draft({ requirementId: "unknown-req" })], new Set());
    expect(result).toHaveLength(0);
  });

  it("dedups duplicate entries for the same requirementId, keeping the first", () => {
    const result = buildSuggestionsFromDraft(
      [req()],
      [draft({ rationale: "first" }), draft({ rationale: "second" })],
      new Set(["bullet1"]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].rationale).toBe("first");
  });

  it("produces exactly one suggestion per unmatched requirement given a well-formed draft for each", () => {
    const requirements = [req({ id: "req1" }), req({ id: "req2", text: "React experience" })];
    const drafts = [
      draft({ requirementId: "req1" }),
      draft({ requirementId: "req2", action: "GAP", rationale: "No React anywhere on the resume." }),
    ];
    const result = buildSuggestionsFromDraft(requirements, drafts, new Set(["bullet1"]));
    expect(result.map((s) => s.requirementId).sort()).toEqual(["req1", "req2"]);
  });
});
