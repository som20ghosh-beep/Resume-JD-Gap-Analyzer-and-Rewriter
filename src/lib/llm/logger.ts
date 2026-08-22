import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), ".logs", "llm");

/** Logs every prompt/response pair to .logs/llm/ in dev for debugging (spec §8). Never runs
 *  in production, and failures here must never break the actual LLM call. */
export async function logLlmCall(name: string, payload: unknown): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(LOG_DIR, `${stamp}-${name}.json`);
    await writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write LLM debug log", err);
  }
}
