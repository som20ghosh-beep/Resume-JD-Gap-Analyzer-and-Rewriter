import { create } from "zustand";
import type { AtsScore, JobDescription, Resume, Suggestion } from "@/lib/types";

type AnalysisResult = {
  resume: Resume;
  jd: JobDescription;
  baselineScore: AtsScore;
  suggestions: Suggestion[];
};

type ApplyResultState = {
  newResume: Resume | null;
  newScore: AtsScore | null;
  changelog: string | null;
};

type ReviewState = AnalysisResult &
  ApplyResultState & {
    hasAnalysis: boolean;
    hasApplied: boolean;
    setAnalysis: (result: AnalysisResult) => void;
    /** Merges a patch into one suggestion — used for approve/reject, edit-then-approve
     *  (proposedText override), and CONFIRM's gating userInput. */
    updateSuggestion: (id: string, patch: Partial<Suggestion>) => void;
    approveAllRephrase: () => void;
    setApplyResult: (result: { resume: Resume; newScore: AtsScore; changelog: string }) => void;
    reset: () => void;
  };

const EMPTY_ANALYSIS: AnalysisResult = {
  resume: null as unknown as Resume,
  jd: null as unknown as JobDescription,
  baselineScore: null as unknown as AtsScore,
  suggestions: [],
};

const EMPTY_APPLY: ApplyResultState = {
  newResume: null,
  newScore: null,
  changelog: null,
};

export const useReviewStore = create<ReviewState>((set) => ({
  ...EMPTY_ANALYSIS,
  ...EMPTY_APPLY,
  hasAnalysis: false,
  hasApplied: false,

  setAnalysis: (result) => set({ ...result, ...EMPTY_APPLY, hasAnalysis: true, hasApplied: false }),

  updateSuggestion: (id, patch) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  approveAllRephrase: () =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.action === "REPHRASE" && s.status === "PENDING" ? { ...s, status: "APPROVED" } : s,
      ),
    })),

  setApplyResult: ({ resume, newScore, changelog }) =>
    set({ newResume: resume, newScore, changelog, hasApplied: true }),

  reset: () => set({ ...EMPTY_ANALYSIS, ...EMPTY_APPLY, hasAnalysis: false, hasApplied: false }),
}));
