import type {
  Certification,
  Education,
  Experience,
  Project,
  Resume,
  Skill,
} from "@/lib/types";

// Shared heuristic parsing engine. Both the PDF and DOCX extractors reduce their source
// format down to a flat list of RawLine (text + an optional style-based "this looks like a
// heading" signal), then hand that list to buildResume() here. Keeping the section/entry
// splitting logic in one place means the two formats produce identically-structured output
// and any heuristic improvement benefits both.

export type RawLine = {
  text: string;
  /** True when the source format gave us a style signal (bold run, docx Heading style,
   *  larger font size than body text) suggesting this line is a section/entry heading. */
  looksLikeHeading?: boolean;
  /** True when the source line came from a real list item (docx <li>), which carries no
   *  literal bullet glyph in its text — BULLET_PREFIX_RE alone can't detect it. */
  isListItem?: boolean;
};

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

const SECTION_SYNONYMS: Record<SectionKey, string[]> = {
  summary: ["summary", "objective", "profile", "about me", "professional summary"],
  experience: [
    "experience",
    "work experience",
    "employment",
    "employment history",
    "work history",
    "professional experience",
    "career history",
  ],
  education: ["education", "academic background", "academics"],
  skills: [
    "skills",
    "technical skills",
    "core competencies",
    "key skills",
    "expertise",
    "skills & tools",
  ],
  projects: ["projects", "personal projects", "side projects", "selected projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "licenses & certifications",
    "licenses and certifications",
  ],
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const URL_RE = /\bhttps?:\/\/[^\s,)]+/gi;
const BARE_DOMAIN_RE = /\b(?:linkedin\.com|github\.com|gitlab\.com)\/[^\s,)]+/gi;
const YEAR_RE = /\b(19|20)\d{2}\b/;
const DATE_RANGE_RE =
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(19|20)\d{2}\b\s*(?:[-–—]|to)\s*(Present|Current|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2})/i;
const DEGREE_RE =
  /\b(Bachelor|Master|B\.?S\.?|M\.?S\.?|M\.?B\.?A\.?|B\.?A\.?|Ph\.?D\.?|Associate)\b/i;
const BULLET_PREFIX_RE = /^[••▪●*\-–]\s+/;

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function stripBullet(text: string): string {
  return text.replace(BULLET_PREFIX_RE, "").trim();
}

function looksLikeSentenceOrBullet(text: string): boolean {
  return /[.!?]$/.test(text.trim()) || BULLET_PREFIX_RE.test(text);
}

/** Matches a line against the known section synonym map. Returns the section key on a hit. */
function matchSectionKeyword(text: string): SectionKey | null {
  const normalized = text.trim().toLowerCase().replace(/[:]+$/, "");
  if (normalized.length === 0 || normalized.length > 40) return null;
  for (const [key, synonyms] of Object.entries(SECTION_SYNONYMS) as [
    SectionKey,
    string[],
  ][]) {
    if (synonyms.includes(normalized)) return key;
  }
  return null;
}

/** A line "looks like" a heading by shape alone — ALL CAPS or Title Case and short — which is
 *  the only signal available for PDFs, where we have no font/bold metadata to lean on. */
function looksHeadingShaped(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return false;
  const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  const isTitleCase = words.every((w) => /^[A-Z][a-zA-Z'&.-]*$/.test(w));
  return isAllCaps || isTitleCase;
}

/** A line counts as a heading candidate if it's short, unpunctuated, and either matches a
 *  known section name, carries a style signal from the source parser (DOCX), or is shaped
 *  like a heading (ALL CAPS / Title Case — the fallback signal for PDFs, which have no style
 *  metadata at all). */
function classifyHeading(
  line: RawLine,
): { section: SectionKey } | { custom: string } | null {
  const text = line.text.trim();
  if (text.length === 0 || text.length > 40) return null;
  if (looksLikeSentenceOrBullet(text)) return null;

  const known = matchSectionKeyword(text);
  if (known) return { section: known };

  // DOCX always sets looksLikeHeading explicitly (true or false) from real style metadata —
  // trust it exclusively there. PDF never sets it (undefined), so fall back to the shape
  // heuristic, which is noisier (a bare two-word company/institution name like "Boston
  // University" is indistinguishable from a heading by shape alone) but is the only signal
  // PDF has at all.
  const isHeadingSignal =
    line.looksLikeHeading === true ||
    (line.looksLikeHeading === undefined && looksHeadingShaped(text));

  if (text.split(/\s+/).length <= 5 && isHeadingSignal) {
    return { custom: text };
  }
  return null;
}

function extractContact(preamble: RawLine[], warnings: string[]) {
  const joined = preamble.map((l) => l.text).join("\n");

  const emailMatch = joined.match(EMAIL_RE);
  const phoneMatch = joined.match(PHONE_RE);

  const links: { label: string; url: string }[] = [];
  for (const m of joined.matchAll(URL_RE)) {
    links.push({ label: labelForUrl(m[0]), url: m[0] });
  }
  for (const m of joined.matchAll(BARE_DOMAIN_RE)) {
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    if (!links.some((l) => l.url === url)) {
      links.push({ label: labelForUrl(url), url });
    }
  }

  // Name: first preamble line that isn't the email/phone/a link and isn't itself a heading.
  const nameLine = preamble.find((l) => {
    const t = l.text.trim();
    if (t.length === 0) return false;
    if (EMAIL_RE.test(t) || PHONE_RE.test(t) || URL_RE.test(t)) return false;
    return true;
  });

  // Location: a short "City, ST" / "City, Country" line that isn't the name line.
  const locationLine = preamble.find(
    (l) =>
      l !== nameLine &&
      /^[A-Za-z .]+,\s*[A-Za-z .]+$/.test(l.text.trim()) &&
      l.text.trim().length < 40,
  );

  if (!emailMatch) warnings.push("No email address found in the resume header.");
  if (!nameLine) warnings.push("Could not confidently identify a name in the resume header.");

  return {
    name: nameLine?.text.trim() ?? "",
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0]?.trim(),
    location: locationLine?.text.trim(),
    links,
  };
}

function labelForUrl(url: string): string {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/github\.com/i.test(url)) return "GitHub";
  if (/gitlab\.com/i.test(url)) return "GitLab";
  return "Link";
}

function isBulletLine(line: RawLine): boolean {
  return line.isListItem === true || BULLET_PREFIX_RE.test(line.text.trim());
}

function newExperienceEntry(header: string): Experience {
  const [companyPart, titlePart] = splitHeaderParts(header);
  return {
    id: newId("exp"),
    company: companyPart,
    title: titlePart,
    startDate: "",
    endDate: "Present",
    bullets: [],
  };
}

function applyDates(entry: Experience, dateText: string): void {
  entry.startDate = dateText.split(/[-–—]|to/i)[0].trim();
  entry.endDate = /present|current/i.test(dateText) ? "Present" : extractEndDate(dateText);
}

function buildExperience(lines: RawLine[]): Experience[] {
  const entries: Experience[] = [];
  let current: Experience | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) continue;

    const dateMatch = text.match(DATE_RANGE_RE);
    if (dateMatch) {
      // A date-only line right after a fresh header (no dates/bullets yet) fills in that
      // entry rather than starting a new one — "Company — Title" and "Jan 2021 - Present"
      // are commonly two separate lines rather than one.
      if (current && current.startDate === "" && current.bullets.length === 0) {
        applyDates(current, dateMatch[0]);
        continue;
      }
      const header = text.replace(DATE_RANGE_RE, "").replace(/[,|–—-]+$/, "").trim();
      current = newExperienceEntry(header);
      entries.push(current);
      applyDates(current, dateMatch[0]);
      continue;
    }

    if (isBulletLine(line)) {
      if (!current) {
        current = newExperienceEntry("");
        entries.push(current);
      }
      current.bullets.push({
        id: newId("bullet"),
        text: stripBullet(text),
        isGenerated: false,
      });
      continue;
    }

    // A non-date, non-bullet line starts a new entry once the current one already has a
    // date or bullets — otherwise (two header-ish lines in a row) it's extra header context.
    if (!current || current.bullets.length > 0 || current.startDate !== "") {
      current = newExperienceEntry(text);
      entries.push(current);
    } else {
      current.title = current.title ? `${current.title} ${text}` : text;
    }
  }

  return entries;
}

function splitHeaderParts(text: string): [string, string] {
  const delimiters = [" — ", " – ", " - ", " | ", " at ", ", "];
  for (const d of delimiters) {
    if (text.includes(d)) {
      const [a, b] = text.split(d);
      return [a.trim(), (b ?? "").trim()];
    }
  }
  return [text, ""];
}

function extractEndDate(range: string): string {
  const parts = range.split(/[-–—]|to/i);
  return (parts[1] ?? "").trim() || range.trim();
}

function buildEducation(lines: RawLine[]): Education[] {
  const entries: Education[] = [];
  let current: Education | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) continue;

    if (DEGREE_RE.test(text) || YEAR_RE.test(text)) {
      const yearMatch = text.match(YEAR_RE);
      const [institutionPart, degreePart] = splitHeaderParts(
        text.replace(YEAR_RE, "").trim(),
      );

      // A degree/year line right after an institution-only entry (no degree/year yet) fills
      // that entry in rather than starting a new one — "University" and "Degree, Year" are
      // commonly two separate lines. splitHeaderParts's first slot holds the degree name
      // here (e.g. "Bachelor of Science"), not an institution — we already have that.
      if (current && current.degree === "" && !current.year) {
        current.degree = institutionPart || degreePart || text;
        current.year = yearMatch?.[0];
        continue;
      }

      current = {
        id: newId("edu"),
        institution: institutionPart,
        degree: degreePart || institutionPart,
        year: yearMatch?.[0],
      };
      entries.push(current);
      continue;
    }

    if (!current || (current.degree !== "" && current.year)) {
      current = { id: newId("edu"), institution: text, degree: "" };
      entries.push(current);
      continue;
    }

    current.details = current.details ? `${current.details} ${text}` : text;
  }

  return entries;
}

function buildSkills(lines: RawLine[]): Skill[] {
  const skills: Skill[] = [];
  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) continue;

    let category = "General";
    let rest = text;
    const colonIdx = text.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      category = text.slice(0, colonIdx).trim();
      rest = text.slice(colonIdx + 1).trim();
    }

    for (const token of rest.split(/[,;|]/)) {
      const name = stripBullet(token).trim();
      if (name.length === 0) continue;
      skills.push({
        id: newId("skill"),
        name,
        category,
        isGenerated: false,
        userAttested: true,
      });
    }
  }
  return skills;
}

function buildProjects(lines: RawLine[]): Project[] {
  const projects: Project[] = [];
  let current: Project | null = null;

  for (const line of lines) {
    const raw = line.text.trim();
    if (raw.length === 0) continue;
    const text = stripBullet(raw);

    // A short, unpunctuated, non-bulleted line reads as a project title even without a
    // style signal — this is what lets the PDF path (no bold/heading info) still split
    // multiple projects instead of collapsing them into one.
    const isTitleLike =
      !isBulletLine(line) &&
      !looksLikeSentenceOrBullet(text) &&
      text.split(/\s+/).length <= 8;

    if (!current || line.looksLikeHeading || isTitleLike) {
      current = { id: newId("proj"), name: text, description: "", tech: [] };
      projects.push(current);
      continue;
    }

    current.description = current.description ? `${current.description} ${text}` : text;
  }

  return projects;
}

function buildCertifications(lines: RawLine[]): Certification[] {
  return lines
    .map((l) => stripBullet(l.text.trim()))
    .filter((t) => t.length > 0)
    .map((text) => {
      const yearMatch = text.match(YEAR_RE);
      const [namePart, issuerPart] = splitHeaderParts(
        text.replace(YEAR_RE, "").trim(),
      );
      return {
        id: newId("cert"),
        name: namePart,
        issuer: issuerPart || undefined,
        year: yearMatch?.[0],
      };
    });
}

export function buildResume(
  lines: RawLine[],
  rawText: string,
  extraWarnings: string[] = [],
): Resume {
  const warnings = [...extraWarnings];

  const nonEmpty = lines.filter((l) => l.text.trim().length > 0);

  // Walk the lines once, bucketing them under the most recently seen section heading.
  const preamble: RawLine[] = [];
  const sections: Record<SectionKey, RawLine[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
  const unrecognizedSections: { title: string; lines: RawLine[] }[] = [];

  let current: SectionKey | "unrecognized" | null = null;
  let currentUnrecognized: { title: string; lines: RawLine[] } | null = null;

  for (const [index, line] of nonEmpty.entries()) {
    // The very first content line is always the candidate's name, never a section heading —
    // without this guard, a two-word Title Case name (the overwhelmingly common case) would
    // get misclassified as an "unrecognized heading" by the shape-based fallback below.
    let heading = index === 0 ? null : classifyHeading(line);

    // A short Title-Case/ALL-CAPS line is normal, expected content inside Skills or Projects
    // (a single skill, a one-word project name like "Nginx") — the shape-based "custom
    // heading" guess (classifyHeading's fallback for PDFs, which have no style metadata) has
    // no awareness of the section it's already inside and would otherwise peel that content
    // out into a bogus top-level "unrecognized section", corrupting the list it belongs to.
    // A real, known section synonym (`"section" in heading`) still always ends the section —
    // only the ambiguous shape-only guess is suppressed here.
    if (heading && !("section" in heading) && (current === "skills" || current === "projects")) {
      heading = null;
    }

    if (heading) {
      if ("section" in heading) {
        current = heading.section;
      } else {
        current = "unrecognized";
        currentUnrecognized = { title: heading.custom, lines: [] };
        unrecognizedSections.push(currentUnrecognized);
        warnings.push(
          `Unrecognized section heading "${heading.custom}" — its content was kept but not categorized.`,
        );
      }
      continue;
    }

    if (current === null) {
      preamble.push(line);
    } else if (current === "unrecognized") {
      currentUnrecognized!.lines.push(line);
    } else {
      sections[current].push(line);
    }
  }

  const contact = extractContact(preamble, warnings);

  // A summary paragraph sometimes sits in the preamble with no heading at all: the first
  // preamble line is the name, everything else that isn't contact-info-shaped is the summary.
  let summary = sections.summary.map((l) => l.text).join(" ").trim() || undefined;
  if (!summary) {
    const leftover = preamble.filter((l) => {
      const t = l.text.trim();
      return (
        t !== contact.name &&
        t !== contact.location &&
        !EMAIL_RE.test(t) &&
        !PHONE_RE.test(t) &&
        !URL_RE.test(t) &&
        t.length > 0
      );
    });
    if (leftover.length > 0) {
      summary = leftover.map((l) => l.text.trim()).join(" ");
    }
  }

  const experience = buildExperience(sections.experience);
  const education = buildEducation(sections.education);
  const skills = buildSkills(sections.skills);
  const projects = buildProjects(sections.projects);
  const certifications = buildCertifications(sections.certifications);

  if (experience.length === 0) warnings.push("No experience section detected.");
  if (education.length === 0) warnings.push("No education section detected.");
  if (skills.length === 0) warnings.push("No skills section detected.");

  return {
    id: newId("resume"),
    version: 1,
    contact,
    summary,
    experience,
    education,
    skills,
    projects: projects.length > 0 ? projects : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    rawText,
    parseWarnings: warnings,
  };
}
