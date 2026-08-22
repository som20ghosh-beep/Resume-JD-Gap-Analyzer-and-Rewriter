import mammoth from "mammoth";
import JSZip from "jszip";
import type { Resume } from "@/lib/types";
import { ParseError } from "./errors";
import { buildResume, type RawLine } from "./normalize";

const MIN_CHARS_FOR_TEXT_DOCX = 20;
const BLOCK_RE = /<(h[1-6]|p|li|td)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const TABLE_RE = /<table[\s>]/i;
const WHOLE_BOLD_RE = /^<strong>[\s\S]*<\/strong>$/i;
const HTML_TAG_RE = /<[^>]+>/g;

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&[a-z#0-9]+;/gi, (m) => ENTITY_MAP[m] ?? m);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(HTML_TAG_RE, "")).trim();
}

function htmlToLines(html: string): RawLine[] {
  const lines: RawLine[] = [];
  for (const match of html.matchAll(BLOCK_RE)) {
    const [, tag, inner] = match;
    const text = stripTags(inner);
    if (text.length === 0) continue;

    const isHeadingTag = /^h[1-6]$/i.test(tag);
    const isWhollyBold = WHOLE_BOLD_RE.test(inner.trim());
    lines.push({
      text,
      looksLikeHeading: isHeadingTag || isWhollyBold,
      isListItem: tag.toLowerCase() === "li",
    });
  }
  return lines;
}

async function detectLayoutWarnings(buffer: Buffer): Promise<string[]> {
  const warnings: string[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    if (documentXml && /<w:cols[^>]*\bw:num="[2-9]/.test(documentXml)) {
      warnings.push(
        "Multi-column section layout detected in the document; reading order may not exactly match the original.",
      );
    }

    const headerFooterFiles = Object.keys(zip.files).filter((name) =>
      /^word\/(header|footer)\d*\.xml$/.test(name),
    );
    for (const name of headerFooterFiles) {
      const xml = await zip.file(name)?.async("string");
      const text = xml ? stripTags(xml.replace(/<w:p\b/g, "\n<w:p")) : "";
      if (text.trim().length > 0) {
        warnings.push(
          "Contact info or other content found in a header/footer was not extracted — headers and footers are ignored by the parser and are also an ATS-hostile pattern.",
        );
        break;
      }
    }
  } catch {
    // Best-effort layout detection; failure here shouldn't block parsing the document itself.
  }
  return warnings;
}

export async function parseDocx(buffer: Buffer): Promise<Resume> {
  let html: string;
  let rawText: string;
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const textResult = await mammoth.extractRawText({ buffer });
    html = htmlResult.value;
    rawText = textResult.value;
  } catch {
    throw new ParseError(
      "UNREADABLE_DOCX",
      "This file could not be read as a DOCX. It may be corrupt or in an unsupported format.",
    );
  }

  if (rawText.trim().length < MIN_CHARS_FOR_TEXT_DOCX) {
    throw new ParseError(
      "EMPTY_DOCX",
      "This DOCX file has no extractable text content.",
    );
  }

  const layoutWarnings = await detectLayoutWarnings(buffer);
  if (TABLE_RE.test(html)) {
    layoutWarnings.push(
      "Table content detected in the document; cell text was flattened to plain lines and may need manual review.",
    );
  }
  const lines = htmlToLines(html);

  return buildResume(lines, rawText, layoutWarnings);
}
