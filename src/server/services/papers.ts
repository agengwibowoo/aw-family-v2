import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "../db";
import {
  documentStatus,
  documents,
  hospitalDocuments,
  hospitals,
  packs,
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

/** The master list of papers, in the order they are asked for. */
export async function listDocuments() {
  return db.select().from(documents).orderBy(asc(documents.sortOrder));
}

/** Just the name, for the card left behind when a paper is ticked off. */
export async function paperName(documentId: number): Promise<string | null> {
  const row = await db.query.documents.findFirst({
    columns: { name: true },
    where: eq(documents.id, documentId),
  });
  return row?.name ?? null;
}

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
  /** The hospital's own note about its requirement, not the household's. */
  requirementNote: string | null;
  /** Which drawer, folder or bag the original lives in. Null until someone says. */
  whereKept: string | null;
  ready: boolean;
  /** Why not, in the words the row will show. Null when ready. */
  blocker: string | null;
  /** Stated relative to the due date, because that is the deadline that matters. */
  expiryNote: string | null;
};

/**
 * What changed when the picked hospital changed.
 *
 * Never a silent re-score. Papers going from ready to not-ready without anyone
 * saying why is how you arrive at a hospital at 3am missing a referral letter
 * you had no idea you needed.
 */
export type PapersChange = {
  fromName: string;
  toName: string;
  /** Papers the new place wants that the old one did not. */
  added: string[];
  /** Papers you no longer need to bring. Good news, and it says so. */
  dropped: string[];
};

export type PapersPack = {
  hospitalId: string | null;
  hospitalName: string | null;
  /** True when no hospital is picked and we are showing the common set. */
  provisional: boolean;
  lines: PaperLine[];
  ready: PaperLine[];
  missing: PaperLine[];
  /** Null when the pack is scored against the place it was last scored against. */
  changed: PapersChange | null;
};

/** The one pack that holds the papers. Named, so week 36 can reuse it. */
const PAPERS_PACK = "Papers for the hospital";

async function papersPackRow() {
  return db.query.packs.findFirst({ where: eq(packs.name, PAPERS_PACK) });
}

/**
 * Remembers which place the papers were last scored against.
 *
 * Called when a hospital is picked rather than when the screen is read: a read
 * must not write, and the first pick has nothing to compare itself to.
 */
export async function notePickedHospitalForPapers(
  hospitalId: string,
  by: string,
): Promise<void> {
  const existing = await papersPackRow();

  if (existing) {
    // The place it was tracking is gone — the foreign key nulled the column
    // rather than deleting the pack. Adopt the current pick, because a pack
    // pointing at nothing can never report a change again.
    if (existing.hospitalId === null) {
      await db
        .update(packs)
        .set({ hospitalId, updatedBy: by, updatedAt: new Date() })
        .where(eq(packs.id, existing.id));
    }
    return; // Already tracking; reporting the diff is the screen's job.
  }

  await db.insert(packs).values({
    name: PAPERS_PACK,
    purpose: "The papers this hospital wants on admission",
    hospitalId,
    createdBy: by,
    updatedBy: by,
  });
}

/** Says the change has been read. The pack is now scored against this place. */
export async function acknowledgePapersChange(
  hospitalId: string,
  by: string,
): Promise<void> {
  const existing = await papersPackRow();
  if (!existing) {
    await notePickedHospitalForPapers(hospitalId, by);
    return;
  }
  await db
    .update(packs)
    .set({ hospitalId, updatedBy: by, updatedAt: new Date() })
    .where(eq(packs.id, existing.id));
}

async function changeSincePack(
  picked: { id: string; name: string } | undefined,
  documentNames: Map<number, string>,
): Promise<PapersChange | null> {
  if (!picked) return null;

  const pack = await papersPackRow();
  if (!pack?.hospitalId || pack.hospitalId === picked.id) return null;

  const previous = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, pack.hospitalId),
  });
  if (!previous) return null;

  const [before, after] = await Promise.all([
    db
      .select({ documentId: hospitalDocuments.documentId })
      .from(hospitalDocuments)
      .where(
        and(
          eq(hospitalDocuments.hospitalId, pack.hospitalId),
          eq(hospitalDocuments.required, true),
        ),
      ),
    db
      .select({ documentId: hospitalDocuments.documentId })
      .from(hospitalDocuments)
      .where(
        and(
          eq(hospitalDocuments.hospitalId, picked.id),
          eq(hospitalDocuments.required, true),
        ),
      ),
  ]);

  const had = new Set(before.map((r) => r.documentId));
  const wants = new Set(after.map((r) => r.documentId));

  const name = (id: number) => documentNames.get(id) ?? "a paper";

  return {
    fromName: previous.name,
    toName: picked.name,
    added: [...wants].filter((id) => !had.has(id)).map(name),
    dropped: [...had].filter((id) => !wants.has(id)).map(name),
  };
}

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
      requirementNote: requirement?.notes ?? null,
      whereKept: status?.whereKept ?? null,
      ready,
      blocker: blockerFor(haveOriginal, copiesRequired, copiesMade),
      expiryNote: expiryNoteFor(expiresOn, dueDate),
    };
  });

  const changed = await changeSincePack(
    picked,
    new Map(allDocuments.map((d) => [d.id, d.name])),
  );

  return {
    hospitalId: picked?.id ?? null,
    hospitalName: picked?.name ?? null,
    provisional: !picked,
    lines,
    ready: lines.filter((l) => l.ready),
    // Only the ones still to sort out go above the fold. The done ones are
    // proof, not work.
    missing: lines.filter((l) => !l.ready && l.required),
    changed,
  };
}

/**
 * "RS Pondok also wants a referral letter."
 *
 * One sentence naming the change, in the words of the papers themselves. It is
 * a sentence and not a list because it has to be readable at a glance by
 * somebody who did not make the decision.
 */
export function describeChange(change: PapersChange): string {
  const list = (names: string[]) =>
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  if (change.added.length > 0 && change.dropped.length > 0) {
    return `${change.toName} also wants ${list(change.added)}, and no longer needs ${list(change.dropped)}.`;
  }
  if (change.added.length > 0) {
    return `${change.toName} also wants ${list(change.added)}.`;
  }
  if (change.dropped.length > 0) {
    return `${change.toName} doesn't need ${list(change.dropped)}.`;
  }
  return `${change.toName} wants the same papers ${change.fromName} did.`;
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
    whereKept?: string | null;
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
