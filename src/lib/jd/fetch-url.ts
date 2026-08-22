import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ParseError } from "@/lib/parsers/errors";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MIN_ARTICLE_CHARS = 100;

/** Fetches a job posting URL server-side and strips it down to article text via Readability
 *  (the same extraction Firefox Reader View uses) — job boards are full of nav/footer/script
 *  cruft that would otherwise dilute the LLM's requirement extraction. */
export async function fetchJobPostingText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ParseError("INVALID_URL", "That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ParseError("INVALID_URL", "Only http(s) URLs are supported.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResumeFitBot/1.0; +https://localhost) fetching a URL the user provided",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      throw new ParseError(
        "URL_FETCH_FAILED",
        `Could not fetch that URL (HTTP ${response.status}).`,
      );
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new ParseError("URL_NOT_HTML", "That URL did not return an HTML page.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ParseError("URL_FETCH_FAILED", "Could not read the response body.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new ParseError("URL_TOO_LARGE", "That page is larger than the 5 MB limit.");
      }
      chunks.push(value);
    }
    html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  } catch (err) {
    if (err instanceof ParseError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ParseError("URL_TIMEOUT", "Timed out fetching that URL.");
    }
    throw new ParseError("URL_FETCH_FAILED", "Could not fetch that URL.");
  } finally {
    clearTimeout(timeout);
  }

  return extractArticleText(html, parsed.toString());
}

/** Pure HTML -> article text extraction, split out from the network fetch above so it can be
 *  unit-tested offline against fixture HTML. */
export function extractArticleText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  const text = article?.textContent?.trim() ?? "";
  if (text.length >= MIN_ARTICLE_CHARS) {
    const title = article?.title ? `${article.title}\n\n` : "";
    return title + text;
  }

  // Readability found no article-shaped content (common on some ATS pages that render the
  // posting outside <article>-like structure) — fall back to stripping script/style/nav/
  // footer/header tags and taking whatever body text remains.
  for (const tag of ["script", "style", "nav", "footer", "header", "noscript"]) {
    dom.window.document.querySelectorAll(tag).forEach((el) => el.remove());
  }
  const fallbackText = dom.window.document.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (fallbackText.length < MIN_ARTICLE_CHARS) {
    throw new ParseError(
      "URL_NO_CONTENT",
      "Could not extract meaningful text from that page. Try pasting the job description instead.",
    );
  }
  return fallbackText;
}
