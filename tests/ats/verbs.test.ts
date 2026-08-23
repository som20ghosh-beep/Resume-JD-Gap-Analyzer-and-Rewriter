import { describe, expect, it } from "vitest";
import { startsWithActionVerb } from "@/lib/ats/verbs";

describe("startsWithActionVerb", () => {
  it("recognizes a bullet starting with a strong action verb", () => {
    expect(startsWithActionVerb("Led a team of 5 engineers.")).toBe(true);
  });

  it("strips a leading bullet glyph before checking the first word", () => {
    expect(startsWithActionVerb("- Led a team of 5 engineers.")).toBe(true);
    expect(startsWithActionVerb("• Built a data pipeline.")).toBe(true);
  });

  it("rejects passive/weak openers", () => {
    expect(startsWithActionVerb("Responsible for managing a team.")).toBe(false);
    expect(startsWithActionVerb("Worked on various projects.")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(startsWithActionVerb("LED the migration effort.")).toBe(true);
  });

  it("returns false for empty text", () => {
    expect(startsWithActionVerb("")).toBe(false);
    expect(startsWithActionVerb("   ")).toBe(false);
  });
});
