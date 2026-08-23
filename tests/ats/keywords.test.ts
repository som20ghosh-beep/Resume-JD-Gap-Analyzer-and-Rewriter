import { describe, expect, it } from "vitest";
import { canonicalKeyword, matchRequirements, normalizeForMatching } from "@/lib/ats/keywords";
import type { JobDescription, Resume } from "@/lib/types";

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: "r1",
    version: 1,
    contact: { name: "Jane Doe", email: "jane@example.com", links: [] },
    experience: [],
    education: [],
    skills: [],
    rawText: "",
    parseWarnings: [],
    ...overrides,
  };
}

function req(overrides: Partial<JobDescription["requirements"][number]>) {
  return {
    id: "req1",
    text: "requirement",
    type: "HARD_SKILL" as const,
    priority: "MUST_HAVE" as const,
    keywords: [],
    ...overrides,
  };
}

describe("normalizeForMatching", () => {
  it("lowercases, strips punctuation, and singularizes", () => {
    expect(normalizeForMatching("CI/CD Pipelines")).toBe("ci cd pipeline");
    expect(normalizeForMatching("APIs")).toBe("api");
  });

  it("leaves short tokens like acronyms alone", () => {
    expect(normalizeForMatching("K8s")).toBe("k8s");
  });
});

describe("canonicalKeyword", () => {
  it("uses the first keyword when present", () => {
    expect(canonicalKeyword(req({ keywords: ["kubernetes", "k8s"] }))).toBe("kubernetes");
  });

  it("falls back to the requirement text when there are no keywords", () => {
    expect(canonicalKeyword(req({ text: "5+ years of experience", keywords: [] }))).toBe(
      "5+ years of experience",
    );
  });
});

describe("matchRequirements", () => {
  it("marks a requirement matched in an experience bullet as matchedInBullet", () => {
    const resume = makeResume({
      experience: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: [{ id: "b1", text: "Deployed services to K8s clusters.", isGenerated: false }],
        },
      ],
    });
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [req({ id: "r1", keywords: ["kubernetes", "k8s"] })],
    };

    const [match] = matchRequirements(resume, jd);
    expect(match.matched).toBe(true);
    expect(match.matchedInBullet).toBe(true);
  });

  it("marks a requirement matched only in the skills list as matched but not matchedInBullet", () => {
    const resume = makeResume({
      skills: [{ id: "s1", name: "Python", category: "Languages", isGenerated: false, userAttested: true }],
    });
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [req({ id: "r1", keywords: ["python"] })],
    };

    const [match] = matchRequirements(resume, jd);
    expect(match.matched).toBe(true);
    expect(match.matchedInBullet).toBe(false);
  });

  it("marks a requirement with no evidence anywhere as unmatched", () => {
    const resume = makeResume();
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [req({ id: "r1", keywords: ["figma"] })],
    };

    const [match] = matchRequirements(resume, jd);
    expect(match.matched).toBe(false);
    expect(match.matchedInBullet).toBe(false);
  });

  it("does not false-positive on a substring of another word", () => {
    const resume = makeResume({
      skills: [{ id: "s1", name: "JavaScript", category: "Languages", isGenerated: false, userAttested: true }],
    });
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [req({ id: "r1", keywords: ["java"] })],
    };

    const [match] = matchRequirements(resume, jd);
    expect(match.matched).toBe(false);
  });

  it("falls back to the requirement text when keywords is empty", () => {
    const resume = makeResume({ rawText: "", summary: "5+ years of backend experience." });
    const jd: JobDescription = {
      id: "jd1",
      title: "Engineer",
      rawText: "",
      requirements: [req({ id: "r1", text: "5+ years of backend experience", keywords: [] })],
    };

    const [match] = matchRequirements(resume, jd);
    expect(match.matched).toBe(true);
  });
});
