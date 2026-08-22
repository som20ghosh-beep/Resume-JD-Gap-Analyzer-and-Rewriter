import { prisma } from "@/lib/db";
import { ResumeSchema, type Resume } from "@/lib/types";

/** Persists a freshly parsed resume as version 1 of a new document. The parser's own
 *  `resume.id` is discarded in favor of the document id Prisma assigns, since that id is
 *  what the rest of the app (JD matching, suggestions, exports) references. */
export async function createResumeDocument(
  resume: Resume,
  originalName: string,
  originalMime: string,
): Promise<Resume> {
  const document = await prisma.resumeDocument.create({
    data: { originalName, originalMime },
  });

  const finalResume: Resume = { ...resume, id: document.id, version: 1 };
  ResumeSchema.parse(finalResume);

  await prisma.resumeVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      data: JSON.stringify(finalResume),
      changelog: "Initial upload",
    },
  });

  return finalResume;
}

export async function getLatestResumeVersion(documentId: string): Promise<Resume | null> {
  const row = await prisma.resumeVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
  });
  if (!row) return null;
  return ResumeSchema.parse(JSON.parse(row.data));
}

export async function listResumeVersions(documentId: string) {
  const rows = await prisma.resumeVersion.findMany({
    where: { documentId },
    orderBy: { version: "asc" },
    select: { version: true, changelog: true, createdAt: true },
  });
  return rows;
}

/** Appends a new immutable version on top of the document's current latest version.
 *  Never mutates a prior version — edits always create version N+1. */
export async function appendResumeVersion(
  documentId: string,
  resume: Resume,
  changelog: string,
): Promise<Resume> {
  const latest = await prisma.resumeVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const finalResume: Resume = { ...resume, id: documentId, version: nextVersion };
  ResumeSchema.parse(finalResume);

  await prisma.resumeVersion.create({
    data: {
      documentId,
      version: nextVersion,
      data: JSON.stringify(finalResume),
      changelog,
    },
  });

  return finalResume;
}
