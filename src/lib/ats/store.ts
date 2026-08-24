import { prisma } from "@/lib/db";
import { AtsScoreSchema, type AtsScore } from "@/lib/types";

export async function saveAtsScoreRecord(
  documentId: string,
  resumeVersion: number,
  jdId: string,
  score: AtsScore,
): Promise<AtsScore> {
  AtsScoreSchema.parse(score);
  await prisma.atsScoreRecord.create({
    data: { documentId, resumeVersion, jdId, data: JSON.stringify(score) },
  });
  return score;
}

/** The jdId a resume was most recently scored/analyzed against — lets /api/apply recover
 *  which JobDescription to rescore with, since its request body only carries resumeId
 *  (spec §7: `POST /api/apply → { resumeId, approvedSuggestions }`, no jdId). */
export async function getLatestJdIdForResume(documentId: string): Promise<string | null> {
  const row = await prisma.atsScoreRecord.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
  return row?.jdId ?? null;
}

export async function listAtsScoreRecords(documentId: string, jdId: string) {
  const rows = await prisma.atsScoreRecord.findMany({
    where: { documentId, jdId },
    orderBy: { resumeVersion: "asc" },
  });
  return rows.map((row) => ({
    resumeVersion: row.resumeVersion,
    createdAt: row.createdAt,
    score: AtsScoreSchema.parse(JSON.parse(row.data)),
  }));
}
