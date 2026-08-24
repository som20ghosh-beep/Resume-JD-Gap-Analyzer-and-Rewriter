import { Loader2 } from "lucide-react";

/** Shown by every screen that guards on Zustand store state (spec §10: "empty states") —
 *  navigating here directly (a refresh, a bookmarked URL) has nothing to show since the
 *  in-memory store is gone, so this bridges the redirect back to "/" instead of a blank
 *  flash while the effect fires. */
export function LoadingRedirect() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Redirecting…
      </div>
    </main>
  );
}
