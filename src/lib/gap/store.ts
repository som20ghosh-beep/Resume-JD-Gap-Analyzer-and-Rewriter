import { prisma } from "@/lib/db";
import { SuggestionSchema, type Suggestion } from "@/lib/types";

/** Replaces the PENDING suggestions for a (resume document, JD) pair with a freshly drafted
 *  set — so re-running analysis after an edit doesn't pile up duplicates — while leaving any
 *  already-APPROVED/REJECTED suggestions alone as history for the changelog (phase 7). */
export async function replaceSuggestions(
  documentId: string,
  jdId: string,
  suggestions: Suggestion[],
): Promise<Suggestion[]> {
  for (const s of suggestions) SuggestionSchema.parse(s);

  await prisma.$transaction([
    prisma.suggestion.deleteMany({ where: { documentId, jdId, status: "PENDING" } }),
    ...suggestions.map((s) =>
      prisma.suggestion.create({
        data: {
          id: s.id,
          documentId,
          jdId,
          action: s.action,
          status: s.status,
          data: JSON.stringify(s),
        },
      }),
    ),
  ]);

  return suggestions;
}

export async function listSuggestions(documentId: string, jdId: string): Promise<Suggestion[]> {
  const rows = await prisma.suggestion.findMany({
    where: { documentId, jdId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => SuggestionSchema.parse(JSON.parse(row.data)));
}
