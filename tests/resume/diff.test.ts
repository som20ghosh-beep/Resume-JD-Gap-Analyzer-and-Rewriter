import { describe, expect, it } from "vitest";
import { computeWordDiff } from "@/lib/resume/diff";

function reconstructBefore(segments: ReturnType<typeof computeWordDiff>): string {
  return segments.filter((s) => s.type !== "insert").map((s) => s.text).join("");
}

function reconstructAfter(segments: ReturnType<typeof computeWordDiff>): string {
  return segments.filter((s) => s.type !== "delete").map((s) => s.text).join("");
}

describe("computeWordDiff", () => {
  it("reconstructs both original strings exactly from the segments", () => {
    const before = "Set up Jenkins pipelines for continuous integration";
    const after = "Implemented CI/CD pipelines using Jenkins for continuous integration.";
    const segments = computeWordDiff(before, after);
    expect(reconstructBefore(segments)).toBe(before);
    expect(reconstructAfter(segments)).toBe(after);
  });

  it("returns a single equal segment for identical text", () => {
    const segments = computeWordDiff("Led a team of 5 engineers.", "Led a team of 5 engineers.");
    expect(segments.every((s) => s.type === "equal")).toBe(true);
    expect(reconstructAfter(segments)).toBe("Led a team of 5 engineers.");
  });

  it("groups changes at whole-word boundaries, never splitting a word across segments", () => {
    const segments = computeWordDiff(
      "Set up Jenkins pipelines for continuous integration",
      "Implemented CI/CD pipelines using Jenkins for continuous integration.",
    );
    // Without cleanupSemantic running on the token-encoded diff (before expansion), this
    // would instead split into "pipeline"/"s" and "Jenkin"/"s" fragments.
    expect(segments).toEqual([
      { type: "delete", text: "Set up Jenkins pipelines" },
      { type: "insert", text: "Implemented CI/CD pipelines using Jenkins" },
      { type: "equal", text: " for continuous " },
      { type: "delete", text: "integration" },
      { type: "insert", text: "integration." },
    ]);
  });

  it("handles a pure insertion (empty before)", () => {
    const segments = computeWordDiff("", "New text entirely.");
    expect(reconstructBefore(segments)).toBe("");
    expect(reconstructAfter(segments)).toBe("New text entirely.");
  });

  it("handles a pure deletion (empty after)", () => {
    const segments = computeWordDiff("Old text entirely.", "");
    expect(reconstructBefore(segments)).toBe("Old text entirely.");
    expect(reconstructAfter(segments)).toBe("");
  });
});
