import { z } from "zod";

// Structured domain shapes. The LLM's job is to fill these shapes via schema-validated JSON
// responses — never to return free text the app parses loosely. See spec §4 and §8.

export const LinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const ContactSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(LinkSchema),
});

export const BulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  isGenerated: z.boolean(),
  sourceSuggestionId: z.string().optional(),
});

export const ExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.union([z.string(), z.literal("Present")]),
  bullets: z.array(BulletSchema),
});

export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  year: z.string().optional(),
  details: z.string().optional(),
});

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  isGenerated: z.boolean(),
  userAttested: z.boolean(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  link: z.string().optional(),
});

export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  year: z.string().optional(),
});

export const ResumeSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  contact: ContactSchema,
  summary: z.string().optional(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  rawText: z.string(),
  parseWarnings: z.array(z.string()),
});
export type Resume = z.infer<typeof ResumeSchema>;

export const RequirementTypeSchema = z.enum([
  "HARD_SKILL",
  "SOFT_SKILL",
  "TOOL",
  "QUALIFICATION",
  "RESPONSIBILITY",
  "EXPERIENCE_YEARS",
]);
export type RequirementType = z.infer<typeof RequirementTypeSchema>;

export const RequirementPrioritySchema = z.enum(["MUST_HAVE", "NICE_TO_HAVE"]);
export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: RequirementTypeSchema,
  priority: RequirementPrioritySchema,
  keywords: z.array(z.string()),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const JobDescriptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().optional(),
  rawText: z.string(),
  requirements: z.array(RequirementSchema),
});
export type JobDescription = z.infer<typeof JobDescriptionSchema>;

export const SuggestionActionSchema = z.enum(["REPHRASE", "CONFIRM", "GAP"]);
export type SuggestionAction = z.infer<typeof SuggestionActionSchema>;

export const SuggestionTargetSectionSchema = z
  .enum(["summary", "experience", "skills", "projects", "certifications"])
  .nullable();
export type SuggestionTargetSection = z.infer<typeof SuggestionTargetSectionSchema>;

export const SuggestionStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_INPUT",
]);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const SuggestionSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  requirementText: z.string(),
  action: SuggestionActionSchema,
  targetSection: SuggestionTargetSectionSchema,
  targetItemId: z.string().optional(),
  currentText: z.string().optional(),
  proposedText: z.string().optional(),
  rationale: z.string(),
  evidence: z.string().optional(),
  status: SuggestionStatusSchema,
  userInput: z.string().optional(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const AtsCategorySchema = z.object({
  name: z.string(),
  score: z.number(),
  max: z.number(),
  findings: z.array(z.string()),
});
export type AtsCategory = z.infer<typeof AtsCategorySchema>;

export const AtsScoreSchema = z.object({
  total: z.number().min(0).max(100),
  categories: z.array(AtsCategorySchema),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  computedAt: z.string(),
});
export type AtsScore = z.infer<typeof AtsScoreSchema>;

// Typed API error shape returned by every route on failure (spec §7). Never leaks stack traces.
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
