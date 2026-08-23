import type { AtsCategory, AtsScore, Resume } from "@/lib/types";
import type { JobDescription } from "@/lib/types";
import { canonicalKeyword, matchRequirements } from "@/lib/ats/keywords";
import { startsWithActionVerb } from "@/lib/ats/verbs";

// Pure, deterministic ATS scoring (spec §3.2, §5). No LLM call anywhere in this file — same
// Resume + JobDescription input must always produce the same AtsScore.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const QUANTIFIER_RE = /[\d$€£%]/;
const FIRST_PERSON_RE = /\b(i|me|my|we|our|us)\b/i;
const RESPONSIBLE_FOR_RE = /\bresponsible for\b/i;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---- A. Keyword & skill match — 35 pts ------------------------------------------------

const A_MAX = 35;
const A_BONUS_MAX = 7; // capped at 20% of A_MAX per spec §5A
const A_BASE_MAX = A_MAX - A_BONUS_MAX;

function scoreKeywordMatch(
  resume: Resume,
  jd: JobDescription,
): { category: AtsCategory; matchedKeywords: string[]; missingKeywords: string[] } {
  const findings: string[] = [];

  if (jd.requirements.length === 0) {
    return {
      category: {
        name: "Keyword & skill match",
        score: 0,
        max: A_MAX,
        findings: ["No requirements were extracted from the job description."],
      },
      matchedKeywords: [],
      missingKeywords: [],
    };
  }

  const matches = matchRequirements(resume, jd);
  const weight = (r: JobDescription["requirements"][number]) =>
    r.priority === "MUST_HAVE" ? 2 : 1;

  const totalWeight = matches.reduce((sum, m) => sum + weight(m.requirement), 0);
  const matchedWeight = matches
    .filter((m) => m.matched)
    .reduce((sum, m) => sum + weight(m.requirement), 0);
  const bulletWeight = matches
    .filter((m) => m.matchedInBullet)
    .reduce((sum, m) => sum + weight(m.requirement), 0);

  const base = totalWeight > 0 ? (matchedWeight / totalWeight) * A_BASE_MAX : 0;
  const bonus = totalWeight > 0 ? (bulletWeight / totalWeight) * A_BONUS_MAX : 0;

  const missing = matches.filter((m) => !m.matched);
  const MAX_LISTED = 10;
  for (const m of missing.slice(0, MAX_LISTED)) {
    findings.push(`Missing requirement: "${m.requirement.text}" (${m.requirement.priority}).`);
  }
  if (missing.length > MAX_LISTED) {
    findings.push(`...and ${missing.length - MAX_LISTED} more missing requirement(s).`);
  }

  return {
    category: {
      name: "Keyword & skill match",
      score: round1(base + bonus),
      max: A_MAX,
      findings,
    },
    matchedKeywords: matches.filter((m) => m.matched).map((m) => canonicalKeyword(m.requirement)),
    missingKeywords: missing.map((m) => canonicalKeyword(m.requirement)),
  };
}

// ---- B. Section completeness — 15 pts --------------------------------------------------

const B_MAX = 15;
const B_PER_ITEM = 3;

function scoreSectionCompleteness(resume: Resume): AtsCategory {
  const findings: string[] = [];
  const checks: [boolean, string][] = [
    [EMAIL_RE.test(resume.contact.email), "Contact block is missing a valid email address."],
    [Boolean(resume.summary?.trim()), "No summary or objective section found."],
    [resume.experience.length > 0, "No experience entries found."],
    [resume.education.length > 0, "No education entries found."],
    [resume.skills.length > 0, "No skills section found."],
  ];

  let score = 0;
  for (const [ok, message] of checks) {
    if (ok) score += B_PER_ITEM;
    else findings.push(message);
  }

  return { name: "Section completeness", score, max: B_MAX, findings };
}

// ---- C. Formatting & parseability — 20 pts ---------------------------------------------

const C_MAX = 20;
const FORMAT_SIGNALS: { test: (w: string) => boolean; deduction: number }[] = [
  { test: (w) => /multi-column/i.test(w), deduction: 6 },
  { test: (w) => /table/i.test(w), deduction: 5 },
  { test: (w) => /header\/footer/i.test(w), deduction: 5 },
  { test: (w) => /unrecognized section heading/i.test(w), deduction: 2 },
];

function scoreFormatting(resume: Resume): AtsCategory {
  const findings: string[] = [];
  let deduction = 0;

  for (const warning of resume.parseWarnings) {
    const signal = FORMAT_SIGNALS.find((s) => s.test(warning));
    if (signal) {
      deduction += signal.deduction;
      findings.push(warning);
    }
  }

  return { name: "Formatting & parseability", score: Math.max(0, C_MAX - deduction), max: C_MAX, findings };
}

// ---- D. Impact & quantification — 15 pts -----------------------------------------------

const D_MAX = 15;
const D_RATIO_MAX = 10;
const D_QUALITY_MAX = 5;

function scoreImpact(resume: Resume): AtsCategory {
  const bullets = resume.experience.flatMap((exp) => exp.bullets);
  const findings: string[] = [];

  if (bullets.length === 0) {
    return {
      name: "Impact & quantification",
      score: 0,
      max: D_MAX,
      findings: ["No experience bullets found to evaluate impact and quantification."],
    };
  }

  const qualifying = bullets.filter(
    (b) => startsWithActionVerb(b.text) && QUANTIFIER_RE.test(b.text),
  ).length;
  const ratioScore = (qualifying / bullets.length) * D_RATIO_MAX;
  if (qualifying < bullets.length) {
    findings.push(
      `${qualifying} of ${bullets.length} bullet(s) both start with a strong action verb and contain a quantified result (number, %, or currency).`,
    );
  }

  const pronounCount = bullets.filter((b) => FIRST_PERSON_RE.test(b.text)).length;
  const passiveCount = bullets.filter((b) => RESPONSIBLE_FOR_RE.test(b.text)).length;
  if (pronounCount > 0) {
    findings.push(`${pronounCount} bullet(s) use first-person pronouns (I/me/my/we/our/us).`);
  }
  if (passiveCount > 0) {
    findings.push(`${passiveCount} bullet(s) use passive phrasing like "responsible for".`);
  }
  const qualityScore = Math.max(0, D_QUALITY_MAX - Math.min(D_QUALITY_MAX, pronounCount + passiveCount));

  return { name: "Impact & quantification", score: round1(ratioScore + qualityScore), max: D_MAX, findings };
}

// ---- E. Contact & metadata — 5 pts ------------------------------------------------------

const E_MAX = 5;
const E_PER_ITEM = E_MAX / 4;

function scoreContactMetadata(resume: Resume): AtsCategory {
  const findings: string[] = [];
  const checks: [boolean, string][] = [
    [EMAIL_RE.test(resume.contact.email), "No valid email address."],
    [Boolean(resume.contact.phone && PHONE_RE.test(resume.contact.phone)), "No valid phone number."],
    [Boolean(resume.contact.location?.trim()), "No city/region listed."],
    [resume.contact.links.length > 0, "No professional link (portfolio, LinkedIn, GitHub, etc.)."],
  ];

  let score = 0;
  for (const [ok, message] of checks) {
    if (ok) score += E_PER_ITEM;
    else findings.push(message);
  }

  return { name: "Contact & metadata", score: round1(score), max: E_MAX, findings };
}

// ---- F. Readability & length — 10 pts ----------------------------------------------------

const F_MAX = 10;
const WORD_BAND_DEDUCTION = 4;
const BULLET_LENGTH_DEDUCTION_CAP = 3;
const SENTENCE_LENGTH_DEDUCTION_CAP = 2;
const BULLET_COUNT_DEDUCTION = 1;
const STANDARD_BAND = { min: 400, max: 800 };
const EXTENDED_BAND = { min: 400, max: 1200 };
const SENIOR_YEARS_THRESHOLD = 10;
const MAX_BULLETS_PER_ROLE = 6;
const MAX_BULLET_WORDS = 30;
const MAX_SENTENCE_WORDS = 40;

function extractYear(dateText: string): number | null {
  const match = dateText.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/** Best-effort span of the resume's experience in years, from 4-digit years found in
 *  start/end date strings. Returns null when no years could be parsed (dates are free-form
 *  text per the domain model), in which case F falls back to the standard word-count band. */
function estimateYearsOfExperience(resume: Resume): number | null {
  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  for (const exp of resume.experience) {
    const start = extractYear(exp.startDate);
    const end = exp.endDate === "Present" ? currentYear : extractYear(exp.endDate);
    if (start !== null) years.push(start);
    if (end !== null) years.push(end);
  }
  if (years.length === 0) return null;
  return Math.max(0, Math.max(...years) - Math.min(...years));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreReadability(resume: Resume): AtsCategory {
  const findings: string[] = [];
  let deduction = 0;

  const years = estimateYearsOfExperience(resume);
  const band = years !== null && years >= SENIOR_YEARS_THRESHOLD ? EXTENDED_BAND : STANDARD_BAND;
  const totalWords = wordCount(resume.rawText);
  if (totalWords < band.min || totalWords > band.max) {
    deduction += WORD_BAND_DEDUCTION;
    findings.push(
      `Resume is ${totalWords} word(s); target range is ${band.min}–${band.max} words${
        years !== null ? ` for ~${years} yrs experience` : ""
      }.`,
    );
  }

  const bullets = resume.experience.flatMap((exp) => exp.bullets);
  const overLongBullets = bullets.filter((b) => wordCount(b.text) > MAX_BULLET_WORDS).length;
  if (overLongBullets > 0) {
    deduction += Math.min(BULLET_LENGTH_DEDUCTION_CAP, overLongBullets);
    findings.push(`${overLongBullets} bullet(s) exceed ${MAX_BULLET_WORDS} words and should be tightened.`);
  }

  const sentenceSources = [...(resume.summary ? [resume.summary] : []), ...bullets.map((b) => b.text)];
  const overLongSentences = sentenceSources
    .flatMap(splitSentences)
    .filter((s) => wordCount(s) > MAX_SENTENCE_WORDS).length;
  if (overLongSentences > 0) {
    deduction += Math.min(SENTENCE_LENGTH_DEDUCTION_CAP, overLongSentences);
    findings.push(`${overLongSentences} sentence(s) exceed ${MAX_SENTENCE_WORDS} words.`);
  }

  const denseRoles = resume.experience.filter((exp) => exp.bullets.length > MAX_BULLETS_PER_ROLE);
  if (denseRoles.length > 0) {
    deduction += BULLET_COUNT_DEDUCTION;
    const roles = denseRoles.map((exp) => `${exp.title} at ${exp.company}`).join(", ");
    findings.push(`More than ${MAX_BULLETS_PER_ROLE} bullets under a single role: ${roles}.`);
  }

  return { name: "Readability & length", score: Math.max(0, F_MAX - deduction), max: F_MAX, findings };
}

// ---- Top-level -----------------------------------------------------------------------

export function computeAtsScore(resume: Resume, jd: JobDescription): AtsScore {
  const { category: keywordCategory, matchedKeywords, missingKeywords } = scoreKeywordMatch(resume, jd);

  const categories: AtsCategory[] = [
    keywordCategory,
    scoreSectionCompleteness(resume),
    scoreFormatting(resume),
    scoreImpact(resume),
    scoreContactMetadata(resume),
    scoreReadability(resume),
  ];

  const total = Math.min(100, Math.max(0, round1(categories.reduce((sum, c) => sum + c.score, 0))));

  return {
    total,
    categories,
    matchedKeywords,
    missingKeywords,
    computedAt: new Date().toISOString(),
  };
}
