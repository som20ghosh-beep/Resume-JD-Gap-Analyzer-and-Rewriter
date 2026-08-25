import Groq from "groq-sdk";

// Switched from the spec's Anthropic default to Groq per user decision (no Anthropic key
// available, has a Groq one). openai/gpt-oss-120b is one of only two Groq models that
// currently support strict JSON-schema structured outputs (constrained decoding — the model
// literally cannot emit a token that would violate the schema), which is what extract-
// structured.ts relies on. Unlike Claude Opus 5, Groq still supports `temperature`, so
// extraction can use temperature 0 and suggestion wording 0.3 exactly as the spec asks.
export const LLM_MODEL = "openai/gpt-oss-120b";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("MISSING_API_KEY");
  }
  // Default maxRetries (2, so 3 attempts total) got exhausted by a real transient outage —
  // confirmed by replaying the exact same request moments later and having it succeed, which
  // rules out a deterministic bad-request-style failure. The SDK already backs off correctly
  // and only retries the retryable classes (408/409/429/5xx, connection errors), so raising
  // its own budget is simpler and more correct than a parallel hand-rolled retry loop.
  client ??= new Groq({ maxRetries: 4 });
  return client;
}
