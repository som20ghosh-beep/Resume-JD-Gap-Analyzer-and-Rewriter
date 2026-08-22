import Anthropic from "@anthropic-ai/sdk";

// Model choice: Claude Opus 5 removed the `temperature` parameter entirely (400 on any
// value), which conflicts with the spec's literal "temperature 0 for extraction, 0.3 for
// suggestions" wording. Per user decision, we use Opus 5 anyway and get determinism from
// structured outputs (a schema-constrained response) plus low/adaptive effort instead of
// sampling temperature.
export const LLM_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("MISSING_API_KEY");
  }
  client ??= new Anthropic();
  return client;
}
