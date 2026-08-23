import { create } from "zustand";
import type { AtsScore, JobDescription, Resume, Suggestion } from "@/lib/types";

type AnalysisResult = {
  resume: Resume;
  jd: JobDescription;
  baselineScore: AtsScore;
  suggestions: Suggestion[];
};

type ReviewState = AnalysisResult & {
  hasAnalysis: boolean;
  setAnalysis: (result: AnalysisResult) => void;
  /** Merges a patch into one suggestion — used for approve/reject, edit-then-approve
   *  (proposedText override), and CONFIRM's gating userInput. */
  updateSuggestion: (id: string, patch: Partial<Suggestion>) => void;
  approveAllRephrase: () => void;
  reset: () => void;
};

const EMPTY: AnalysisResult = {
  resume: null as unknown as Resume,
  jd: null as unknown as JobDescription,
  baselineScore: null as unknown as AtsScore,
  suggestions: [],
};

export const useReviewStore = create<ReviewState>((set) => ({
  ...EMPTY,
  hasAnalysis: false,

  setAnalysis: (result) => set({ ...result, hasAnalysis: true }),

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

  reset: () => set({ ...EMPTY, hasAnalysis: false }),
}));
