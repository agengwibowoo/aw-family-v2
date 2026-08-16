import assert from "node:assert/strict";
import { asc, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, it } from "vitest";

import { db } from "../db";
import { documents, hospitals } from "../schema";
import {
  coverFor,
  createHospital,
  getHospital,
  getPickedHospital,
  setDecision,
  setHospitalDocuments,
  upsertInsurer,
  upsertQuote,
} from "./hospitals";
import { getPapersPack } from "./papers";
import { assessCover } from "@/domain/insurance";

/**
 * Exercises the deadline-critical path against the real database, through the
 * same functions the screens call.
 *
 * Creates its own rows and removes them afterwards. Names are prefixed so a
 * failed run leaves something obviously disposable rather than something that
 * looks like a real hospital.
 */

const PREFIX = "ztest-";
const ACTOR = "00000000-0000-0000-0000-000000000000";
const created: string[] = [];

/**
 * Picking a hospital demotes whichever one was picked before — including a real
 * one. Remember what was picked going in and put it back, or running the tests
 * silently un-picks the household's actual choice.
 */
let realPick: string | null = null;

/** Real ids, not guessed ones — the seed may be renumbered. */
let documentIds: number[] = [];

async function makeHospital(name: string) {
  const id = await createHospital({ name: `${PREFIX}${name}` }, ACTOR);
  created.push(id);
  return id;
}

beforeAll(async () => {
  realPick = (await getPickedHospital())?.id ?? null;
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .orderBy(asc(documents.sortOrder));
  documentIds = rows.map((r) => r.id);
  assert.ok(documentIds.length >= 2, "seed the documents list first");
});

afterAll(async () => {
  if (created.length > 0) {
    await db.delete(hospitals).where(inArray(hospitals.id, created));
  }

  if (realPick) {
    await setDecision(realPick, "picked", ACTOR);
    assert.equal(
      (await getPickedHospital())?.id,
      realPick,
      "the real picked hospital was not restored",
    );
  }

  const leftovers = await db.select({ id: hospitals.id }).from(hospitals);
  assert.equal(
    leftovers.filter((h) => created.includes(h.id)).length,
    0,
    "test hospitals were left behind",
  );
});

describe("picking a hospital", () => {
  it("demotes the one that was picked before", async () => {
    const a = await makeHospital("A");
    const b = await makeHospital("B");

    await setDecision(a, "picked", ACTOR);
    assert.equal((await getPickedHospital())?.id, a);

    // The partial unique index would reject this if the demote did not happen
    // in the same transaction — a failed save here is indistinguishable from
    // the app being broken.
    await setDecision(b, "picked", ACTOR);

    const picked = await getPickedHospital();
    assert.equal(picked?.id, b);

    const first = await getHospital(a);
    assert.equal(first?.hospital.decision, "shortlisted");
  });

  it("will not rule one out without a reason", async () => {
    const id = await makeHospital("C");
    await assert.rejects(() => setDecision(id, "ruled_out", ACTOR));
    await assert.rejects(() => setDecision(id, "ruled_out", ACTOR, "   "));

    await setDecision(id, "ruled_out", ACTOR, "Peak drive over 45 minutes");
    const row = await getHospital(id);
    assert.equal(row?.hospital.decision, "ruled_out");
    assert.equal(row?.hospital.decisionReason, "Peak drive over 45 minutes");
  });
});

describe("prices", () => {
  it("keeps one price per delivery type and room class", async () => {
    const id = await makeHospital("D");

    await upsertQuote({
      hospitalId: id,
      deliveryType: "Normal",
      roomClass: "Kelas 1",
      priceIdr: "18500000",
      quotedOn: "2026-08-01",
    });
    // Ringing back with a new number replaces it rather than adding a second.
    await upsertQuote({
      hospitalId: id,
      deliveryType: "Normal",
      roomClass: "Kelas 1",
      priceIdr: "19000000",
      quotedOn: "2026-08-16",
    });
    await upsertQuote({
      hospitalId: id,
      deliveryType: "Caesar",
      roomClass: "Kelas 1",
      priceIdr: "32000000",
    });

    const data = await getHospital(id);
    assert.equal(data?.quotes.length, 2);
    const normal = data!.quotes.find((q) => q.deliveryType === "Normal");
    assert.equal(normal?.priceIdr, "19000000");
  });
});

describe("the insurance sentence", () => {
  it("uses the hospital's own line when there is one", async () => {
    const id = await makeHospital("E");
    await upsertInsurer({
      hospitalId: id,
      insurerName: "Test Insurer",
      accepted: false,
      settlement: null,
      requiresPreauth: null,
      preauthLeadDays: null,
    });

    const data = await getHospital(id);
    const policy = {
      insurerName: "Test Insurer",
      policyStartedOn: "2025-01-01",
      maternityWaitingPeriodMonths: 12,
      roomEntitlement: null,
    };

    const cover = coverFor(data!.insurers, policy);
    assert.equal(cover?.accepted, false);

    // The policy alone would say covered; the hospital refusing the insurer
    // has to win, because that is what happens at the desk.
    assert.equal(assessCover(policy, "2026-10-14").kind, "covered");
    assert.equal(assessCover(policy, "2026-10-14", cover).kind, "not_accepted");
  });

  it("matches the insurer regardless of case", async () => {
    const id = await makeHospital("F");
    await upsertInsurer({
      hospitalId: id,
      insurerName: "TEST INSURER",
      accepted: true,
      settlement: "reimbursement",
      requiresPreauth: true,
      preauthLeadDays: 5,
      notes: null,
    });

    const data = await getHospital(id);
    const cover = coverFor(data!.insurers, {
      insurerName: "test insurer",
      policyStartedOn: null,
      maternityWaitingPeriodMonths: null,
      roomEntitlement: null,
    });
    assert.equal(cover?.settlement, "reimbursement");
    assert.equal(cover?.preauthLeadDays, 5);
  });
});

describe("the papers pack", () => {
  it("follows whichever place is picked", async () => {
    const id = await makeHospital("G");
    await setDecision(id, "picked", ACTOR);

    // This place wants two things, one of them in triplicate.
    const [first, second] = documentIds;
    await setHospitalDocuments(id, [
      { documentId: first, copiesRequired: 3 },
      { documentId: second, copiesRequired: 1 },
    ]);

    const pack = await getPapersPack("2026-10-14");
    assert.equal(pack.hospitalName, `${PREFIX}G`);
    assert.equal(pack.provisional, false);

    const ktp = pack.lines.find((l) => l.documentId === first);
    assert.ok(ktp, "the required paper is on the pack");
    assert.equal(ktp.copiesRequired, 3);
    assert.equal(ktp.ready, false);
    // The line that gets forgotten at 3am.
    assert.equal(ktp.blocker, "Don't have it yet · Need 3 copies · none made");

    // Replacing the set removes what is no longer asked for.
    await setHospitalDocuments(id, [{ documentId: first, copiesRequired: 2 }]);
    const after = await getHospital(id);
    assert.equal(after?.papers.length, 1);
    assert.equal(after?.papers[0].copiesRequired, 2);
  });
});
