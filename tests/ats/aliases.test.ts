import { describe, expect, it } from "vitest";
import { expandKeywordVariants, normalizeKeyword } from "@/lib/ats/aliases";

describe("normalizeKeyword", () => {
  it("lowercases, trims, and collapses separators to spaces", () => {
    expect(normalizeKeyword("  CI/CD  ")).toBe("ci cd");
    expect(normalizeKeyword("Node.js")).toBe("node.js");
    expect(normalizeKeyword("K8s")).toBe("k8s");
  });
});

describe("expandKeywordVariants", () => {
  it("expands an abbreviation to include its canonical form", () => {
    const variants = expandKeywordVariants("k8s").map((v) => v.toLowerCase());
    expect(variants).toContain("k8s");
    expect(variants).toContain("kubernetes");
  });

  it("expands the canonical form to include known abbreviations", () => {
    const variants = expandKeywordVariants("JavaScript").map((v) => v.toLowerCase());
    expect(variants).toContain("javascript");
    expect(variants).toContain("js");
  });

  it("passes unknown terms through unchanged", () => {
    expect(expandKeywordVariants("Figma")).toEqual(["Figma"]);
  });

  it("is case-insensitive when matching against the alias groups", () => {
    const variants = expandKeywordVariants("Machine Learning").map((v) => v.toLowerCase());
    expect(variants).toContain("ml");
  });
});
