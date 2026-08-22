// Canonical alias groups for keyword matching (spec §5A: "alias map for js->javascript,
// k8s->kubernetes, ml->machine learning, etc."). Shared by JD extraction (to enrich each
// requirement's keyword list with known variants) and the ATS scorer's keyword matcher
// (phase 4), so both sides of the match use the same vocabulary.
const ALIAS_GROUPS: string[][] = [
  ["javascript", "js"],
  ["typescript", "ts"],
  ["kubernetes", "k8s"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["continuous integration", "ci"],
  ["continuous deployment", "continuous delivery", "cd"],
  ["ci cd", "cicd"],
  ["amazon web services", "aws"],
  ["google cloud platform", "gcp", "google cloud"],
  ["microsoft azure", "azure"],
  ["user interface", "ui"],
  ["user experience", "ux"],
  ["application programming interface", "api"],
  ["representational state transfer", "rest", "restful"],
  ["structured query language", "sql"],
  ["postgresql", "postgres"],
  ["mongodb", "mongo"],
  ["node.js", "nodejs", "node"],
  ["react.js", "reactjs", "react"],
  ["vue.js", "vuejs", "vue"],
  ["golang", "go"],
  ["c sharp", "c#", "csharp"],
  ["c plus plus", "c++", "cpp"],
  ["object oriented programming", "oop"],
  ["test driven development", "tdd"],
  ["software development life cycle", "sdlc"],
  ["natural language processing", "nlp"],
  ["extract transform load", "etl"],
  ["business intelligence", "bi"],
  ["quality assurance", "qa"],
  ["site reliability engineering", "sre"],
  ["infrastructure as code", "iac"],
  ["identity and access management", "iam"],
  ["years of experience", "yoe"],
  ["large language model", "llm"],
];

export function normalizeKeyword(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[/_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GROUP_BY_NORMALIZED_TERM = new Map<string, string[]>();
for (const group of ALIAS_GROUPS) {
  for (const term of group) {
    GROUP_BY_NORMALIZED_TERM.set(normalizeKeyword(term), group);
  }
}

/** Expands a single keyword into itself plus any known surface variants (both directions —
 *  "js" expands to include "javascript" and vice versa). Unknown terms pass through unchanged. */
export function expandKeywordVariants(term: string): string[] {
  const group = GROUP_BY_NORMALIZED_TERM.get(normalizeKeyword(term));
  if (!group) return [term];
  return Array.from(new Set([term, ...group]));
}
