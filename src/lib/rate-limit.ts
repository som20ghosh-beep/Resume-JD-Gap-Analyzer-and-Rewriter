// Minimal in-memory rate limiter for the LLM-backed routes (spec §7). Single-user local app,
// so a per-route sliding window is enough — this guards against runaway loops/costs, not
// abuse from multiple untrusted clients.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}
