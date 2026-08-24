import type { Resume, Suggestion } from "@/lib/types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Returns the updated resume, or null if this suggestion couldn't actually be applied (no
 *  proposedText, or targetItemId doesn't resolve to anything on this resume) — null lets the
 *  caller know it didn't take effect, rather than silently returning the input unchanged. */
function applyRephrase(resume: Resume, suggestion: Suggestion): Resume | null {
  const proposedText = suggestion.proposedText;
  if (!proposedText) return null;

  const itemId = suggestion.targetItemId;
  if (!itemId) {
    // No specific item targeted — the only well-formed case is a summary rewrite.
    return suggestion.targetSection === "summary" ? { ...resume, summary: proposedText } : null;
  }

  const bulletOwner = resume.experience.find((exp) => exp.bullets.some((b) => b.id === itemId));
  if (bulletOwner) {
    return {
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id !== bulletOwner.id
          ? exp
          : {
              ...exp,
              bullets: exp.bullets.map((b) =>
                b.id === itemId
                  ? { ...b, text: proposedText, isGenerated: true, sourceSuggestionId: suggestion.id }
                  : b,
              ),
            },
      ),
    };
  }

  if (resume.skills.some((s) => s.id === itemId)) {
    return {
      ...resume,
      skills: resume.skills.map((s) => (s.id === itemId ? { ...s, name: proposedText, isGenerated: true } : s)),
    };
  }

  const projects = resume.projects ?? [];
  if (projects.some((p) => p.id === itemId)) {
    return {
      ...resume,
      projects: projects.map((p) => (p.id === itemId ? { ...p, description: proposedText } : p)),
    };
  }

  const certifications = resume.certifications ?? [];
  if (certifications.some((c) => c.id === itemId)) {
    return {
      ...resume,
      certifications: certifications.map((c) => (c.id === itemId ? { ...c, name: proposedText } : c)),
    };
  }

  // targetItemId didn't resolve to anything on this resume — ignore rather than guess where it goes.
  return null;
}

/** A CONFIRM only ever reaches here with the user's own supplied detail already attached
 *  (spec §3.1: "store their input verbatim; do not embellish it") — we never invent wording
 *  for it. The confirmed skill is added by its exact requirement text (never a paraphrase),
 *  so nothing beyond what the user attested to appears on the resume. */
function applyConfirm(resume: Resume, suggestion: Suggestion): Resume | null {
  if (!suggestion.userInput?.trim()) return null;
  const newSkill: Resume["skills"][number] = {
    id: newId("skill"),
    name: suggestion.requirementText,
    category: "Confirmed",
    isGenerated: true,
    userAttested: true,
  };
  return { ...resume, skills: [...resume.skills, newSkill] };
}

export type ApplyResult = {
  resume: Resume;
  /** The subset of the input, in original order, that actually took effect — one predicate,
   *  computed once, so a changelog built from this list can never drift from what the resume
   *  actually contains (spec §7 phase 7: "generate changelog"). */
  applied: Suggestion[];
};

/** Applies a set of APPROVED suggestions to a Resume, producing a new Resume (never mutates
 *  the input — spec §3.3: edits are non-destructive). Used both for the live "projected score"
 *  preview in the review UI (phase 6) and as the core of the persisted apply flow (phase 7).
 *
 *  Every safety rule from spec §3.1 is enforced here, not just upstream: a suggestion must
 *  carry status "APPROVED" to have any effect, GAP suggestions are always skipped even if
 *  passed in, and a CONFIRM with no user-supplied input is skipped rather than guessed. */
export function applyApprovedSuggestions(resume: Resume, suggestions: Suggestion[]): ApplyResult {
  let next = resume;
  const applied: Suggestion[] = [];

  for (const suggestion of suggestions) {
    if (suggestion.status !== "APPROVED") continue;
    if (suggestion.action === "GAP") continue;

    const updated =
      suggestion.action === "REPHRASE" ? applyRephrase(next, suggestion) : applyConfirm(next, suggestion);

    if (updated) {
      next = updated;
      applied.push(suggestion);
    }
  }

  return { resume: next, applied };
}
