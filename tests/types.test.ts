import { describe, expect, it } from "vitest";
import { ResumeSchema } from "@/lib/types";

describe("ResumeSchema", () => {
  it("accepts a minimal valid resume", () => {
    const result = ResumeSchema.safeParse({
      id: "r1",
      version: 1,
      contact: { name: "Jane Doe", email: "jane@example.com", links: [] },
      experience: [],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a resume missing required contact email", () => {
    const result = ResumeSchema.safeParse({
      id: "r1",
      version: 1,
      contact: { name: "Jane Doe", links: [] },
      experience: [],
      education: [],
      skills: [],
      rawText: "",
      parseWarnings: [],
    });
    expect(result.success).toBe(false);
  });
});
