import assert from "node:assert/strict";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, it } from "vitest";

import { db } from "../db";
import { documentStatus, documents } from "../schema";
import { getPapersPack, paperName, setPaperStatus } from "./papers";

/**
 * Whether a paper is had, and where it is kept, against the real database.
 *
 * `document_status` is household-level and there is exactly one row per paper,
 * so unlike the hospitals tests there is nothing disposable to create — these
 * write to the household's own row. Whatever was there is read in `beforeAll`
 * and put back in `afterAll`, including the case where there was no row at all.
 * Get that wrong and a test run quietly tells the household it has lost a
 * paper it has.
 */

const ACTOR = "00000000-0000-0000-0000-000000000000";
const DUE = "2026-10-14";

/** A real id, not a guessed one — the seed may be renumbered. */
let documentId = 0;

type StatusRow = typeof documentStatus.$inferSelect;
let before: StatusRow | null = null;

/**
 * Whether the snapshot above was actually taken.
 *
 * `afterAll` runs even when `beforeAll` threw, and a null `before` means two
 * opposite things: "there was no row" and "we never got as far as looking".
 * Restoring on the second reading would delete a real row on any setup failure,
 * so the flag has to be separate from the value.
 */
let snapshotTaken = false;

beforeAll(async () => {
  // Universally needed, so the paper is on the pack whether or not the
  // household has picked a hospital.
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.universallyNeeded, true))
    .orderBy(asc(documents.sortOrder));

  assert.ok(rows.length >= 1, "seed the documents list first");
  documentId = rows[0].id;

  before =
    (await db.query.documentStatus.findFirst({
      where: eq(documentStatus.documentId, documentId),
    })) ?? null;
  snapshotTaken = true;
});

afterAll(async () => {
  if (!snapshotTaken) return;

  if (before) {
    await db
      .update(documentStatus)
      .set(before)
      .where(eq(documentStatus.documentId, documentId));
  } else {
    // There was no row going in, so leaving one behind would invent a fact.
    await db
      .delete(documentStatus)
      .where(eq(documentStatus.documentId, documentId));
  }
});

async function line() {
  const pack = await getPapersPack(DUE);
  const found = pack.lines.find((l) => l.documentId === documentId);
  assert.ok(found, "a universally needed paper is always on the pack");
  return { pack, line: found };
}

describe("a paper that was ticked off by accident", () => {
  it("goes back to missing, and the pack counts it again", async () => {
    await setPaperStatus(documentId, { haveOriginal: false, copiesMade: 0 }, ACTOR);

    {
      const { pack, line: l } = await line();
      assert.equal(l.haveOriginal, false);
      assert.equal(l.ready, false);
      assert.ok(!pack.ready.some((r) => r.documentId === documentId));
      if (l.required) {
        assert.ok(pack.missing.some((m) => m.documentId === documentId));
      }
    }

    // "We have it" — with the copies it asks for, so readiness turns on the
    // tick rather than on the copy count.
    const { line: pending } = await line();
    await setPaperStatus(
      documentId,
      { haveOriginal: true, copiesMade: pending.copiesRequired },
      ACTOR,
    );

    {
      const { pack, line: l } = await line();
      assert.equal(l.haveOriginal, true);
      assert.equal(l.ready, true);
      assert.ok(pack.ready.some((r) => r.documentId === documentId));
      assert.ok(!pack.missing.some((m) => m.documentId === documentId));
    }

    // "Haven't got it" — the way back, and it leaves the copies alone. A
    // mis-tap should not also throw away the photocopies you really did make.
    await setPaperStatus(documentId, { haveOriginal: false }, ACTOR);

    {
      const { pack, line: l } = await line();
      assert.equal(l.haveOriginal, false);
      assert.equal(l.ready, false);
      assert.equal(l.copiesMade, pending.copiesRequired);
      assert.ok(!pack.ready.some((r) => r.documentId === documentId));
    }
  });

  it("can be named, for the card that offers the way back", async () => {
    const name = await paperName(documentId);
    assert.ok(name && name.length > 0);

    // An id nobody has is not an error page on the papers screen.
    assert.equal(await paperName(-1), null);
  });
});

describe("where a paper is kept", () => {
  it("survives, and reads back on the paper's own line", async () => {
    // Data, so it stays in whatever language it was typed in.
    await setPaperStatus(documentId, { whereKept: "Laci lemari kamar" }, ACTOR);

    const { line: l } = await line();
    assert.equal(l.whereKept, "Laci lemari kamar");
  });

  it("is null when nobody has said, never an empty string", async () => {
    await setPaperStatus(documentId, { whereKept: null }, ACTOR);

    const { line: l } = await line();
    assert.equal(l.whereKept, null);
  });

  it("does not disturb whether the paper is had", async () => {
    await setPaperStatus(
      documentId,
      { haveOriginal: true, copiesMade: 2 },
      ACTOR,
    );
    await setPaperStatus(documentId, { whereKept: "Map biru" }, ACTOR);

    const { line: l } = await line();
    assert.equal(l.whereKept, "Map biru");
    assert.equal(l.haveOriginal, true);
    assert.equal(l.copiesMade, 2);
  });
});
