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
