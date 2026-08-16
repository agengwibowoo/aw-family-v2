import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "../db";
import {
  documentStatus,
  documents,
  hospitalDocuments,
  hospitals,
} from "../schema";
import { daysBetween, formatDayMonth, type PlainDate } from "@/domain/dates";

/**
 * The papers a hospital wants on admission, and whether you have them.
 *
 * Whether you have a Kartu Keluarga is a fact about the household, not about a
 * hospital, so it is tracked once and every hospital's requirement points at
 * it. That is what lets the screen say "6 of 8 ready for RS X" without holding
 * the same fact in two places.
 */

export type PaperLine = {
  documentId: number;
  name: string;
  issuedBy: string | null;
  required: boolean;
  copiesRequired: number;
  copiesMade: number;
  haveOriginal: boolean;
  scans: string[];
  expiresOn: PlainDate | null;
  notes: string | null;
  ready: boolean;
  /** Why not, in the words the row will show. Null when ready. */
  blocker: string | null;
  /** Stated relative to the due date, because that is the deadline that matters. */
  expiryNote: string | null;
};

export type PapersPack = {
  hospitalName: string | null;
  /** True when no hospital is picked and we are showing the common set. */
  provisional: boolean;
  lines: PaperLine[];
  ready: PaperLine[];
  missing: PaperLine[];
};

export async function getPapersPack(dueDate: PlainDate): Promise<PapersPack> {
  const picked = await db.query.hospitals.findFirst({
    where: eq(hospitals.decision, "picked"),
  });

  const [allDocuments, statuses] = await Promise.all([
    db.select().from(documents).orderBy(asc(documents.sortOrder)),
    db.select().from(documentStatus),
  ]);

  const statusBy = new Map(statuses.map((s) => [s.documentId, s]));

  const requirements = picked
    ? await db
        .select()
        .from(hospitalDocuments)
        .where(eq(hospitalDocuments.hospitalId, picked.id))
    : [];
  const requirementBy = new Map(requirements.map((r) => [r.documentId, r]));

  // With no hospital picked, show what every hospital asks for. The list may
  // grow once one is picked, and the screen says so rather than pretending.
  const relevant = picked
    ? allDocuments.filter(
        (d) => requirementBy.has(d.id) || d.universallyNeeded,
      )
    : allDocuments.filter((d) => d.universallyNeeded);

  const lines = relevant.map((doc): PaperLine => {
    const requirement = requirementBy.get(doc.id);
    const status = statusBy.get(doc.id);

    const required = requirement?.required ?? true;
    const copiesRequired = requirement?.copiesRequired ?? 0;
    const copiesMade = status?.copiesMade ?? 0;
    const haveOriginal = status?.haveOriginal ?? false;
    const scans = status?.imagePaths ?? [];
    const expiresOn = status?.expiresOn ?? null;

    const ready = haveOriginal && copiesMade >= copiesRequired;

    return {
      documentId: doc.id,
      name: doc.name,
      issuedBy: doc.issuedBy,
      required,
      copiesRequired,
      copiesMade,
      haveOriginal,
      scans,
      expiresOn,
      notes: requirement?.notes ?? null,
      ready,
      blocker: blockerFor(haveOriginal, copiesRequired, copiesMade),
      expiryNote: expiryNoteFor(expiresOn, dueDate),
    };
  });

  return {
    hospitalName: picked?.name ?? null,
    provisional: !picked,
    lines,
    ready: lines.filter((l) => l.ready),
    // Only the ones still to sort out go above the fold. The done ones are
    // proof, not work.
    missing: lines.filter((l) => !l.ready && l.required),
  };
}

function blockerFor(
  haveOriginal: boolean,
  copiesRequired: number,
  copiesMade: number,
): string | null {
  if (!haveOriginal && copiesRequired > 0) {
    return `Don't have it yet · ${copiesLine(copiesRequired, copiesMade)}`;
  }
  if (!haveOriginal) return "Don't have it yet";
  if (copiesMade < copiesRequired) return copiesLine(copiesRequired, copiesMade);
  return null;
}

/** "Need 3 copies · none made" — the line that gets forgotten at 3am. */
function copiesLine(required: number, made: number): string {
  const need = `Need ${required} ${required === 1 ? "copy" : "copies"}`;
  if (made === 0) return `${need} · none made`;
  if (made >= required) return `${need} · all made`;
  return `${need} · ${made} made`;
}

/** The screen does the arithmetic, not the reader. */
function expiryNoteFor(
  expiresOn: PlainDate | null,
  dueDate: PlainDate,
): string | null {
  if (!expiresOn) return null;
  const when = formatDayMonth(expiresOn);
  if (daysBetween(expiresOn, dueDate) > 0) {
    return `Runs out ${when} — before the due date`;
  }
  if (daysBetween(dueDate, expiresOn) <= 60) {
    return `Runs out ${when}, soon after the due date`;
  }
  return null;
}

export async function setPaperStatus(
  documentId: number,
  patch: {
    haveOriginal?: boolean;
    copiesMade?: number;
    expiresOn?: PlainDate | null;
    notes?: string | null;
  },
  by: string,
): Promise<void> {
  await db
    .insert(documentStatus)
    .values({ documentId, ...patch, createdBy: by, updatedBy: by })
    .onConflictDoUpdate({
      target: documentStatus.documentId,
      set: { ...patch, updatedBy: by, updatedAt: new Date() },
    });
}
