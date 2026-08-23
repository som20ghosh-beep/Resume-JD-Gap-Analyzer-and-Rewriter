import type { JobDescription, Requirement, Resume } from "@/lib/types";

/** Naive English singularizer — good enough for keyword matching, not linguistically complete. */
function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (/[^aeiou]ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (/ss$/.test(word)) return word;
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Lowercases, strips punctuation, and singularizes each word — used to compare JD keywords
 *  against resume text with minor surface variation ignored (spec §5A). */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeWord)
    .join(" ");
}

/** Word-boundary-safe substring check: `needle` must appear as a run of whole words in
 *  `haystack`, both already normalized. */
function containsPhrase(haystackPadded: string, needle: string): boolean {
  if (!needle) return false;
  return haystackPadded.includes(` ${needle} `);
}

function pad(normalized: string): string {
  return ` ${normalized} `;
}

/** Builds the normalized, word-boundary-padded text corpora a requirement's keywords are
 *  checked against. Kept separate so callers can tell whether a match came from an experience
 *  bullet (strong evidence) or elsewhere on the resume (weaker evidence) — spec §5A. */
export function buildResumeCorpora(resume: Resume) {
  const bulletText = resume.experience
    .flatMap((exp) => exp.bullets.map((b) => b.text))
    .join(" \n ");

  const otherText = [
    resume.summary ?? "",
    resume.skills.map((s) => s.name).join(" "),
    resume.education
      .map((e) => [e.institution, e.degree, e.field, e.details].filter(Boolean).join(" "))
      .join(" "),
    (resume.projects ?? [])
      .map((p) => [p.name, p.description, ...p.tech].join(" "))
      .join(" "),
    (resume.certifications ?? [])
      .map((c) => [c.name, c.issuer].filter(Boolean).join(" "))
      .join(" "),
  ].join(" \n ");

  return {
    bullet: pad(normalizeForMatching(bulletText)),
    other: pad(normalizeForMatching(otherText)),
  };
}

/** The canonical label used to represent a requirement in `matchedKeywords`/`missingKeywords`. */
export function canonicalKeyword(requirement: Requirement): string {
  return requirement.keywords[0] ?? requirement.text;
}

export type RequirementMatch = {
  requirement: Requirement;
  /** Matched anywhere on the resume (bullets or elsewhere). */
  matched: boolean;
  /** Matched specifically in an experience bullet — the stronger evidence tier. */
  matchedInBullet: boolean;
};

function requirementKeywords(requirement: Requirement): string[] {
  return requirement.keywords.length > 0 ? requirement.keywords : [requirement.text];
}

/** Checks each JD requirement's keywords against the resume's bullet and "other" corpora. */
export function matchRequirements(
  resume: Resume,
  jd: JobDescription,
): RequirementMatch[] {
  const corpora = buildResumeCorpora(resume);

  return jd.requirements.map((requirement) => {
    const normalizedKeywords = requirementKeywords(requirement)
      .map(normalizeForMatching)
      .filter(Boolean);

    const matchedInBullet = normalizedKeywords.some((kw) => containsPhrase(corpora.bullet, kw));
    const matchedElsewhere = normalizedKeywords.some((kw) => containsPhrase(corpora.other, kw));

    return {
      requirement,
      matched: matchedInBullet || matchedElsewhere,
      matchedInBullet,
    };
  });
}
