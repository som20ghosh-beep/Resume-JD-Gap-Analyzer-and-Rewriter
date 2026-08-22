import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Badge variant="outline">Phase 1 — Scaffold</Badge>
      <h1 className="text-3xl font-semibold tracking-tight">ResumeFit</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Resume ↔ Job Description gap analyzer and rewriter. The upload/JD input screen
        lands in Phase 2.
      </p>
    </main>
  );
}
