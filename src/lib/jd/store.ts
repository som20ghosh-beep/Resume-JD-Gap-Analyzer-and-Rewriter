import { prisma } from "@/lib/db";
import { JobDescriptionSchema, type JobDescription } from "@/lib/types";

export async function createJobDescriptionRecord(
  jd: JobDescription,
): Promise<JobDescription> {
  JobDescriptionSchema.parse(jd);
  const row = await prisma.jobDescriptionRecord.create({
    data: { data: JSON.stringify(jd) },
  });
  return { ...jd, id: row.id };
}

export async function getJobDescriptionRecord(id: string): Promise<JobDescription | null> {
  const row = await prisma.jobDescriptionRecord.findUnique({ where: { id } });
  if (!row) return null;
  return JobDescriptionSchema.parse(JSON.parse(row.data));
}
