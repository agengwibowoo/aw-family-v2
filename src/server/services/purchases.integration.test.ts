import assert from "node:assert/strict";
import { asc, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, it } from "vitest";

import { db } from "../db";
import { ageBands, categories, itemUnits, items, purchases } from "../schema";
import {
  addUnits,
  deletePurchase,
  recordPurchase,
  retireUnits,
  spendFor,
  undoPurchase,
} from "./purchases";
import { archiveThing, createThing, getThing, listThings } from "./things";

/**
 * The count, against the real database.
 *
 * ADR-0003 makes units the source of truth precisely because the alternative —
 * summing purchases — cannot express a gift, cannot survive a returned item,
 * and reported 2-of-5 as bought in the app this replaces. A bug here corrupts
 * the number on the most-used screen, so every one of these asserts the count
 * rather than the rows that produced it.
 *
 * Creates its own rows and removes them afterwards. Names are prefixed so a
 * failed run leaves something obviously disposable.
 */

const PREFIX = "ztest-";
const ACTOR = "00000000-0000-0000-0000-000000000000";
const created: string[] = [];

let categoryId = 0;
let bandId = 0;

async function makeThing(name: string, need: number): Promise<string> {
  const id = await createThing(
    { name: `${PREFIX}${name}`, targetQty: need, categoryId, ageBandId: bandId },
    ACTOR,
  );
  created.push(id);
  return id;
}

/** The live count, read the way every screen reads it. */
async function have(id: string): Promise<number> {
  const thing = await getThing(id);
  return thing!.thing.have;
}

/** The cache Postgres generates `status` from. It must never drift. */
async function cachedQty(id: string): Promise<number> {
  const [row] = await db
    .select({ ownedQty: items.ownedQty, status: items.status })
    .from(items)
    .where(eq(items.id, id));
  return row.ownedQty;
}

async function statusOf(id: string): Promise<string | null> {
  const [row] = await db
    .select({ status: items.status })
    .from(items)
    .where(eq(items.id, id));
  return row.status;
}

beforeAll(async () => {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .orderBy(asc(categories.sortOrder))
    .limit(1);
  const [band] = await db
    .select({ id: ageBands.id })
    .from(ageBands)
    .orderBy(asc(ageBands.sortOrder))
    .limit(1);

  assert.ok(cat, "seed the categories first");
  assert.ok(band, "seed the age bands first");
  categoryId = cat.id;
  bandId = band.id;
});

afterAll(async () => {
  if (created.length === 0) return;

  // item_units restricts deletion of the thing it is a unit of, so the objects
  // go before the need they were bought for.
  await db.delete(itemUnits).where(inArray(itemUnits.itemId, created));
  await db.delete(items).where(inArray(items.id, created));

  const leftovers = await db.select({ id: items.id }).from(items);
  assert.equal(
    leftovers.filter((i) => created.includes(i.id)).length,
    0,
    "test things were left behind",
  );
});

describe("a purchase spawns units", () => {
  it("turns a purchase of six into six objects in the house", async () => {
    const id = await makeThing("bottles", 6);
    assert.equal(await have(id), 0);

    const result = await recordPurchase({ itemId: id, qty: 6 }, ACTOR);

    assert.equal(result.qty, 6);
    assert.equal(result.have, 6, "the returned count is the live count");
    assert.equal(await have(id), 6);

    const units = await db
      .select({ id: itemUnits.id })
      .from(itemUnits)
      .where(eq(itemUnits.itemId, id));
    assert.equal(units.length, 6, "six objects, not one row saying six");
  });

  it("keeps owned_qty in step, so the generated status word is right", async () => {
    // The legacy rule reported 2 of 5 as bought. This is the guard against it
    // coming back through a stale cache rather than through the rule itself.
    const id = await makeThing("nappies", 5);
    await recordPurchase({ itemId: id, qty: 2 }, ACTOR);

    assert.equal(await cachedQty(id), 2);
    assert.equal(await statusOf(id), "still_need");

    await recordPurchase({ itemId: id, qty: 3 }, ACTOR);
    assert.equal(await cachedQty(id), 5);
    assert.equal(await statusOf(id), "got_it");

    await recordPurchase({ itemId: id, qty: 4 }, ACTOR);
    assert.equal(await cachedQty(id), 9);
    assert.equal(await statusOf(id), "more_than_enough");
  });

  it("refuses a fraction of a thing", async () => {
    const id = await makeThing("swaddles", 4);
    await assert.rejects(() => recordPurchase({ itemId: id, qty: 1.5 }, ACTOR));
    await assert.rejects(() => recordPurchase({ itemId: id, qty: 0 }, ACTOR));
    assert.equal(await have(id), 0);
  });
});

describe("units without a receipt", () => {
  it("counts a gift, which the purchase model could not express at all", async () => {
    const id = await makeThing("gift", 2);
    await addUnits(id, 2, ACTOR, "Given to us");

    assert.equal(await have(id), 2);
    assert.equal(await statusOf(id), "got_it");

    const thing = await getThing(id);
    assert.equal(thing!.purchases.length, 0, "a gift has no receipt");
    assert.equal(thing!.unattributed, 2, "and the screen can still say so");
  });

  it("spends nothing on a gift", async () => {
    const id = await makeThing("free", 1);
    await addUnits(id, 1, ACTOR);
    const { spent, unitPrice } = await spendFor(id);
    assert.equal(spent, 0);
    // Null, not zero. Zero would be a claim about what one costs.
    assert.equal(unitPrice, null);
  });
});

describe("deleting a receipt", () => {
  it("retires the objects rather than deleting them", async () => {
    const id = await makeThing("returned", 6);
    const { purchaseId } = await recordPurchase({ itemId: id, qty: 6 }, ACTOR);
    assert.equal(await have(id), 6);

    await deletePurchase(purchaseId, ACTOR);

    assert.equal(await have(id), 0, "the count goes back");
    assert.equal(await cachedQty(id), 0);

    // History survives the deletion of the receipt. That is the whole reason
    // units are the source of truth.
    const rows = await db
      .select({ retiredOn: itemUnits.retiredOn })
      .from(itemUnits)
      .where(eq(itemUnits.itemId, id));
    assert.equal(rows.length, 6, "the objects are still on record");
    assert.ok(
      rows.every((r) => r.retiredOn !== null),
      "and every one of them is retired",
    );
  });

  it("leaves other receipts for the same thing alone", async () => {
    const id = await makeThing("two-receipts", 10);
    const first = await recordPurchase({ itemId: id, qty: 4 }, ACTOR);
    await recordPurchase({ itemId: id, qty: 3 }, ACTOR);
    assert.equal(await have(id), 7);

    await deletePurchase(first.purchaseId, ACTOR);
    assert.equal(await have(id), 3);
  });
});

describe("undo", () => {
  it("restores the previous count exactly", async () => {
    const id = await makeThing("undo-me", 12);
    await recordPurchase({ itemId: id, qty: 4 }, ACTOR);
    const second = await recordPurchase({ itemId: id, qty: 2 }, ACTOR);
    assert.equal(await have(id), 6);

    const restored = await undoPurchase(second.purchaseId, ACTOR);

    assert.ok(restored, "there was something to undo");
    assert.equal(restored.have, 4, "exactly the count before the mis-tap");
    assert.equal(restored.need, 12);
    assert.equal(await have(id), 4);
  });

  it("refuses once the fifteen minutes are up", async () => {
    // The cookie pointing at a purchase is a pointer, not the authority. Age
    // the receipt past the window and the server must refuse regardless of
    // what the caller believes.
    const id = await makeThing("undo-expired", 5);
    const p = await recordPurchase({ itemId: id, qty: 2 }, ACTOR);
    assert.equal(await have(id), 2);

    await db
      .update(purchases)
      .set({ createdAt: new Date(Date.now() - 20 * 60_000) })
      .where(eq(purchases.id, p.purchaseId));

    assert.equal(
      await undoPurchase(p.purchaseId, ACTOR),
      null,
      "an expired undo is refused",
    );
    assert.equal(await have(id), 2, "and it changed nothing");
  });

  it("has nothing to undo twice", async () => {
    const id = await makeThing("undo-once", 3);
    const p = await recordPurchase({ itemId: id, qty: 1 }, ACTOR);

    assert.ok(await undoPurchase(p.purchaseId, ACTOR));
    assert.equal(
      await undoPurchase(p.purchaseId, ACTOR),
      null,
      "a second undo is not a second deletion",
    );
    assert.equal(await have(id), 0);
  });
});

describe("taking things out of the house", () => {
  it("retires the oldest first, so nobody has to identify a unit", async () => {
    const id = await makeThing("outgrown", 6);
    await recordPurchase({ itemId: id, qty: 3, boughtOn: "2026-01-01" }, ACTOR);
    await recordPurchase({ itemId: id, qty: 3, boughtOn: "2026-06-01" }, ACTOR);
    assert.equal(await have(id), 6);

    await retireUnits(id, 2, "outgrown", ACTOR);
    assert.equal(await have(id), 4);

    const retired = await db
      .select({ acquiredOn: itemUnits.acquiredOn })
      .from(itemUnits)
      .where(eq(itemUnits.itemId, id));
    const gone = retired.filter((r) => r.acquiredOn === "2026-01-01");
    assert.equal(gone.length, 3, "the old batch is where they came from");
  });
});

describe("the list", () => {
  it("leaves archived things out of the counts and the default list", async () => {
    const id = await makeThing("archived", 2);
    await recordPurchase({ itemId: id, qty: 1 }, ACTOR);

    const before = await listThings({ bandId });
    assert.ok(before.some((t) => t.id === id));

    await archiveThing(id, "not_needed", ACTOR);

    const after = await listThings({ bandId });
    assert.equal(
      after.some((t) => t.id === id),
      false,
      "it leaves the default list",
    );

    // Kept, never deleted — its history and its price are still there.
    const kept = await listThings({ bandId, archivedOnly: true });
    assert.ok(kept.some((t) => t.id === id), "and it is still on record");
  });

  it("gives every row a status word derived from its live count", async () => {
    const rows = await listThings({ bandId });
    for (const row of rows.filter((r) => created.includes(r.id))) {
      const expected =
        row.have > row.need
          ? "more_than_enough"
          : row.have >= row.need
            ? "got_it"
            : "still_need";
      assert.equal(row.status, expected, `${row.name} says the right word`);
    }
  });
});
