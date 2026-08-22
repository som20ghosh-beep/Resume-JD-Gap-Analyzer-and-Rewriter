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
  client ??= new Groq();
  return client;
}
