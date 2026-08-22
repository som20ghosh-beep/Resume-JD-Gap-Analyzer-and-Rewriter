import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, LLM_MODEL } from "./client";
import { logLlmCall } from "./logger";

export class LlmExtractionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LlmExtractionError";
    this.code = code;
  }
}

type ExtractParams<T> = {
  /** Short slug used in the debug log filename, e.g. "jd-extraction". */
  name: string;
  system: string;
  userContent: string;
  schema: z.ZodType<T>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
};

/** Calls Claude with a schema-constrained response (spec §8: JSON only, Zod-validated). On a
 *  null parse — a refusal or the rare structured-output miss — retries once with the failure
 *  noted, then fails loudly rather than guessing, per spec. */
export async function extractStructured<T>(params: ExtractParams<T>): Promise<T> {
  const client = getAnthropicClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: params.userContent }];

  const attempt = async (): Promise<{
    parsed: T | null;
    stopReason: string | null;
    raw: unknown;
  }> => {
    const response = await client.messages.parse({
      model: LLM_MODEL,
      max_tokens: params.maxTokens ?? 8000,
      system: params.system,
      messages,
      output_config: {
        format: zodOutputFormat(params.schema),
        effort: params.effort ?? "medium",
      },
    });
    await logLlmCall(params.name, { request: { messages, system: params.system }, response });
    return {
      parsed: response.parsed_output,
      stopReason: response.stop_reason,
      raw: response,
    };
  };

  const first = await attempt();
  if (first.stopReason === "refusal") {
    throw new LlmExtractionError(
      "LLM_REFUSED",
      "The model declined to process this content.",
    );
  }
  if (first.parsed !== null) return first.parsed;

  messages.push(
    { role: "assistant", content: "(no structured output produced)" },
    {
      role: "user",
      content:
        "Your previous response did not match the required schema. Return only the structured fields — no prose, no markdown.",
    },
  );

  const second = await attempt();
  if (second.stopReason === "refusal") {
    throw new LlmExtractionError(
      "LLM_REFUSED",
      "The model declined to process this content.",
    );
  }
  if (second.parsed !== null) return second.parsed;

  throw new LlmExtractionError(
    "LLM_SCHEMA_MISMATCH",
    "The model's response did not match the expected structure after a retry.",
  );
}
