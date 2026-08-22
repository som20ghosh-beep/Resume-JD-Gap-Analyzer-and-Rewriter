import { PDFParse, PasswordException } from "pdf-parse";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { Resume } from "@/lib/types";
import { ParseError } from "./errors";
import { buildResume, type RawLine } from "./normalize";

const MIN_TEXT_ITEMS_FOR_TEXT_PDF = 5;
const MIN_CHARS_FOR_TEXT_PDF = 20;
const ROW_Y_TOLERANCE = 2;
const COLUMN_X_TOLERANCE = 6;

type PositionedItem = { str: string; x: number; y: number };

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

function groupIntoRows(items: PositionedItem[]): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows: PositionedItem[][] = [];
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= ROW_Y_TOLERANCE);
    if (row) row.push(item);
    else rows.push([item]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

/** Detects a recurring column grid (a table) by looking for multiple rows whose items'
 *  x-positions line up with each other — the defining signature of tabular content. */
function detectTable(rows: PositionedItem[][]): boolean {
  const signatures = rows
    .filter((r) => r.length >= 3)
    .map((r) => r.map((it) => Math.round(it.x / 5) * 5));

  let matches = 0;
  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      if (signaturesAlign(signatures[i], signatures[j])) matches++;
    }
  }
  return matches >= 1;
}

function signaturesAlign(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => Math.abs(x - b[i]) <= COLUMN_X_TOLERANCE);
}

/** Detects a two-column layout by checking whether a meaningful number of items sit in the
 *  left and right halves of the page with overlapping vertical ranges (i.e. genuinely side
 *  by side, not just a left-aligned footer under a right-aligned header). */
function detectMultiColumn(
  items: PositionedItem[],
  pageWidth: number,
): { isMultiColumn: boolean; left: PositionedItem[]; right: PositionedItem[] } {
  const mid = pageWidth / 2;
  const left = items.filter((it) => it.x < mid);
  const right = items.filter((it) => it.x >= mid);

  if (left.length < 3 || right.length < 3) {
    return { isMultiColumn: false, left, right };
  }

  const yRange = (arr: PositionedItem[]) => {
    const ys = arr.map((it) => it.y);
    return [Math.min(...ys), Math.max(...ys)] as const;
  };
  const [lMin, lMax] = yRange(left);
  const [rMin, rMax] = yRange(right);
  const overlap = Math.min(lMax, rMax) - Math.max(lMin, rMin);
  const smallerSpan = Math.min(lMax - lMin, rMax - rMin) || 1;

  return { isMultiColumn: overlap / smallerSpan > 0.3, left, right };
}

function rowsToLines(rows: PositionedItem[][]): string[] {
  return rows.map((row) => row.map((it) => it.str).join(" ").trim()).filter((l) => l.length > 0);
}

export async function parsePdf(buffer: Buffer): Promise<Resume> {
  const warnings: string[] = [];

  let info: Awaited<ReturnType<PDFParse["getInfo"]>>;
  let textResult: Awaited<ReturnType<PDFParse["getText"]>>;
  const parser = new PDFParse({ data: buffer });
  try {
    info = await parser.getInfo();
    textResult = await parser.getText();
  } catch (err) {
    if (err instanceof PasswordException) {
      throw new ParseError(
        "PASSWORD_PROTECTED_PDF",
        "This PDF is password-protected. Please upload an unprotected file.",
      );
    }
    throw new ParseError(
      "UNREADABLE_PDF",
      "This file could not be read as a PDF. It may be corrupt or in an unsupported format.",
    );
  } finally {
    await parser.destroy();
  }

  const rawText = textResult.pages.map((p) => p.text).join("\n\n");

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;

  let totalItems = 0;
  let multiColumnPages = 0;
  let tableLikePages = 0;
  const reconstructedLines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: PositionedItem[] = content.items
      .filter(isTextItem)
      .filter((it) => it.str.trim().length > 0)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));

    totalItems += items.length;

    const rows = groupIntoRows(items);
    if (detectTable(rows)) tableLikePages++;

    const { isMultiColumn, left, right } = detectMultiColumn(items, viewport.width);
    if (isMultiColumn) {
      multiColumnPages++;
      reconstructedLines.push(...rowsToLines(groupIntoRows(left)));
      reconstructedLines.push(...rowsToLines(groupIntoRows(right)));
    }
  }
  await doc.destroy();

  if (info.total > 0 && totalItems < MIN_TEXT_ITEMS_FOR_TEXT_PDF && rawText.trim().length < MIN_CHARS_FOR_TEXT_PDF) {
    throw new ParseError(
      "SCANNED_PDF",
      "This PDF appears to be a scanned image with no extractable text layer. Please upload a text-based PDF or a DOCX file.",
    );
  }

  if (multiColumnPages > 0) {
    warnings.push(
      `Multi-column layout detected on ${multiColumnPages} page(s); reading order was reconstructed column-by-column and may not exactly match the original.`,
    );
  }
  if (tableLikePages > 0) {
    warnings.push(
      `Table-like content detected on ${tableLikePages} page(s); it was flattened to plain text and may need manual review.`,
    );
  }

  const sourceText = multiColumnPages > 0 ? reconstructedLines.join("\n") : rawText;
  const lines: RawLine[] = sourceText.split("\n").map((text) => ({ text }));

  return buildResume(lines, rawText, warnings);
}
