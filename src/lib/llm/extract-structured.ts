import { z } from "zod";
import type Groq from "groq-sdk";
import { getGroqClient, LLM_MODEL } from "./client";
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
  /** Spec §8: 0 for extraction, 0.3 for suggestion wording. */
  temperature: number;
};

/** Calls the model with a schema-constrained response (spec §8: JSON only, Zod-validated).
 *  Groq's `strict: true` mode uses constrained decoding — the model cannot emit a token that
 *  would violate the JSON schema — so a parse failure here means malformed JSON slipped
 *  through, not a schema mismatch. Retries once with the failure noted, then fails loudly
 *  rather than guessing, per spec. */
export async function extractStructured<T>(params: ExtractParams<T>): Promise<T> {
  const client = getGroqClient();
  const jsonSchema = z.toJSONSchema(params.schema);
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: params.system },
    { role: "user", content: params.userContent },
  ];

  const attempt = async (): Promise<{ parsed: T | null; raw: unknown }> => {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      temperature: params.temperature,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: params.name, strict: true, schema: jsonSchema },
      },
    });
    await logLlmCall(params.name, { request: { messages }, response });

    const content = response.choices[0]?.message?.content;
    if (!content) return { parsed: null, raw: response };
    try {
      const json: unknown = JSON.parse(content);
      const result = params.schema.safeParse(json);
      return { parsed: result.success ? result.data : null, raw: response };
    } catch {
      return { parsed: null, raw: response };
    }
  };

  const first = await attempt();
  if (first.parsed !== null) return first.parsed;

  messages.push(
    { role: "assistant", content: "(no valid structured output produced)" },
    {
      role: "user",
      content:
        "Your previous response did not match the required JSON schema. Return only the structured fields — no prose, no markdown.",
    },
  );

  const second = await attempt();
  if (second.parsed !== null) return second.parsed;

  throw new LlmExtractionError(
    "LLM_SCHEMA_MISMATCH",
    "The model's response did not match the expected structure after a retry.",
  );
}
