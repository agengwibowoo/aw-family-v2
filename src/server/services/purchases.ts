import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db";
import { itemUnits, items, purchases, unitEvents } from "../schema";
import { todayInHousehold } from "@/domain/dates";

/**
 * Money spent, and the objects that money produced.
 *
 * A purchase is a receipt and nothing more. It does not make the count — units
 * do (ADR-0003). A purchase of six spawns six units in the same transaction,
 * and deleting a purchase *retires* its units rather than deleting them, so the
 * history of what was in the house survives the deletion of the receipt.
 *
 * Units can exist with no purchase at all. That is how a gift and a
 * hand-me-down get expressed, and it matters from day one because of the
 * registry — the count-from-purchases model could not express it at all.
 *
 * A bug in this file corrupts the number on the most-used screen in the app.
 */

/** How long you have to change your mind. */
export const UNDO_WINDOW_MINUTES = 15;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The only writer of `items.owned_qty`.
 *
 * That column is a cache: it exists so Postgres can generate `items.status`,
 * which is what makes the status word correct even against a hand-written
 * statement. It must be recomputed from live units inside the same transaction
 * as every unit write, or the screen and the database disagree.
 */
export async function syncOwnedQtyFromUnits(
  tx: Tx,
  itemId: string,
): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(itemUnits)
    .where(and(eq(itemUnits.itemId, itemId), isNull(itemUnits.retiredOn)));

  const live = row?.n ?? 0;

  await tx
    .update(items)
    .set({ ownedQty: live, updatedAt: new Date() })
    .where(eq(items.id, itemId));

  return live;
}

export type RecordedPurchase = {
  purchaseId: string;
  itemId: string;
  name: string;
  qty: number;
  have: number;
  need: number;
};

/**
 * "Add what we got."
 *
 * The whole of S11 lands here. Price is optional and can never block the save;
 * everything except how many is deferrable.
 */
export async function recordPurchase(
  input: {
    itemId: string;
    qty: number;
    pricePerUnitIdr?: number | null;
    whereBought?: string | null;
    brand?: string | null;
    name?: string | null;
    boughtOn?: string | null;
    notes?: string | null;
  },
  by: string,
): Promise<RecordedPurchase> {
  if (!Number.isInteger(input.qty) || input.qty < 1) {
    throw new Error("You cannot have got a fraction of a thing.");
  }

  return db.transaction(async (tx) => {
    const [thing] = await tx
      .select({ id: items.id, name: items.name, need: items.targetQty })
      .from(items)
      .where(eq(items.id, input.itemId));
    if (!thing) throw new Error("That thing is not in the catalog.");

    const boughtOn = input.boughtOn ?? todayInHousehold();

    const [purchase] = await tx
      .insert(purchases)
      .values({
        itemId: input.itemId,
        qty: input.qty,
        pricePerUnitIdr: input.pricePerUnitIdr?.toString() ?? null,
        whereBought: input.whereBought ?? null,
        brand: input.brand ?? null,
        name: input.name ?? null,
        boughtOn,
        notes: input.notes ?? null,
        createdBy: by,
        updatedBy: by,
      })
      .returning({ id: purchases.id });

    // Six bought is six objects in the house. Same transaction, always.
    const unitRows = await tx
      .insert(itemUnits)
      .values(
        Array.from({ length: input.qty }, () => ({
          itemId: input.itemId,
          purchaseId: purchase.id,
          acquiredOn: boughtOn,
          state: "ready" as const,
          createdBy: by,
          updatedBy: by,
        })),
      )
      .returning({ id: itemUnits.id });

    await tx.insert(unitEvents).values(
      unitRows.map((u) => ({
        unitId: u.id,
        fromState: null,
        toState: "ready",
        actorId: by,
        source: "web" as const,
        note: "Arrived",
      })),
    );

    const have = await syncOwnedQtyFromUnits(tx, input.itemId);

    return {
      purchaseId: purchase.id,
      itemId: input.itemId,
      name: thing.name,
      qty: input.qty,
      have,
      need: thing.need,
    };
  });
}

/**
 * Units with no receipt: a gift, a hand-me-down, something already in the house.
 *
 * The registry means this is needed from day one, not eventually.
 */
export async function addUnits(
  itemId: string,
  qty: number,
  by: string,
  note = "Given to us",
): Promise<number> {
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("You cannot have got a fraction of a thing.");
  }

  return db.transaction(async (tx) => {
    const unitRows = await tx
      .insert(itemUnits)
      .values(
        Array.from({ length: qty }, () => ({
          itemId,
          purchaseId: null,
          state: "ready" as const,
          createdBy: by,
          updatedBy: by,
        })),
      )
      .returning({ id: itemUnits.id });

    await tx.insert(unitEvents).values(
      unitRows.map((u) => ({
        unitId: u.id,
        toState: "ready",
        actorId: by,
        source: "web" as const,
        note,
      })),
    );

    return syncOwnedQtyFromUnits(tx, itemId);
  });
}

/**
 * Deleting a receipt retires the objects it produced; it does not delete them.
 *
 * The count goes back to what it was because a retired unit is not a live one,
 * and the history of what was once in the house survives — which is the whole
 * reason units are the source of truth rather than purchases.
 */
export async function deletePurchase(
  id: string,
  by: string,
  reason = "returned",
): Promise<void> {
  await db.transaction(async (tx) => {
    const [purchase] = await tx
      .select({ itemId: purchases.itemId })
      .from(purchases)
      .where(eq(purchases.id, id));
    if (!purchase) return;

    const live = await tx
      .select({ id: itemUnits.id, state: itemUnits.state })
      .from(itemUnits)
      .where(and(eq(itemUnits.purchaseId, id), isNull(itemUnits.retiredOn)));

    if (live.length > 0) {
      await tx
        .update(itemUnits)
        .set({
          retiredOn: todayInHousehold(),
          retiredReason: reason,
          stateChangedAt: new Date(),
          updatedBy: by,
          updatedAt: new Date(),
        })
        .where(and(eq(itemUnits.purchaseId, id), isNull(itemUnits.retiredOn)));

      await tx.insert(unitEvents).values(
        live.map((u) => ({
          unitId: u.id,
          fromState: u.state,
          toState: null,
          actorId: by,
          source: "web" as const,
          note: reason,
        })),
      );
    }

    await tx.delete(purchases).where(eq(purchases.id, id));
    await syncOwnedQtyFromUnits(tx, purchase.itemId);
  });
}

/**
 * Undo, within fifteen minutes.
 *
 * The only safety mechanism in the app — there are no "are you sure" dialogs
 * anywhere, which is what lets recording a purchase take three seconds. The
 * window is checked here rather than trusted from the caller, because the
 * cookie that points at this purchase is a pointer and not the authority.
 *
 * Returns the count it restored, or null when there was nothing to undo.
 */
export async function undoPurchase(
  id: string,
  by: string,
): Promise<{ itemId: string; name: string; have: number; need: number } | null> {
  const [purchase] = await db
    .select({
      itemId: purchases.itemId,
      createdAt: purchases.createdAt,
      name: items.name,
      need: items.targetQty,
    })
    .from(purchases)
    .innerJoin(items, eq(items.id, purchases.itemId))
    .where(eq(purchases.id, id));

  if (!purchase) return null;

  const ageMinutes =
    (Date.now() - purchase.createdAt.getTime()) / 60_000;
  if (ageMinutes > UNDO_WINDOW_MINUTES) return null;

  // Undone, not returned: she never made this purchase.
  await deletePurchase(id, by, "undone");

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(itemUnits)
    .where(
      and(eq(itemUnits.itemId, purchase.itemId), isNull(itemUnits.retiredOn)),
    );

  return {
    itemId: purchase.itemId,
    name: purchase.name,
    have: row?.n ?? 0,
    need: purchase.need,
  };
}

/**
 * Taking objects out of the house without a receipt to delete — lost, broken,
 * outgrown, given away.
 *
 * Nobody ever identifies a unit. She says how many; the server picks which, by
 * the oldest first, so the app and an agent never disagree about which one
 * moved.
 */
export async function retireUnits(
  itemId: string,
  qty: number,
  reason: string,
  by: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: itemUnits.id, state: itemUnits.state })
      .from(itemUnits)
      .where(and(eq(itemUnits.itemId, itemId), isNull(itemUnits.retiredOn)))
      .orderBy(asc(itemUnits.acquiredOn), asc(itemUnits.stateChangedAt))
      .limit(qty);

    for (const unit of candidates) {
      await tx
        .update(itemUnits)
        .set({
          retiredOn: todayInHousehold(),
          retiredReason: reason,
          stateChangedAt: new Date(),
          updatedBy: by,
          updatedAt: new Date(),
        })
        .where(eq(itemUnits.id, unit.id));

      await tx.insert(unitEvents).values({
        unitId: unit.id,
        fromState: unit.state,
        toState: null,
        actorId: by,
        source: "web",
        note: reason,
      });
    }

    return syncOwnedQtyFromUnits(tx, itemId);
  });
}

/** What has been spent on one thing, and what the rest would roughly cost. */
export async function spendFor(
  itemId: string,
): Promise<{ spent: number; unitPrice: number | null }> {
  const rows = await db
    .select({ qty: purchases.qty, price: purchases.pricePerUnitIdr })
    .from(purchases)
    .where(eq(purchases.itemId, itemId));

  let spent = 0;
  let priced = 0;
  let pricedQty = 0;

  for (const r of rows) {
    if (r.price === null) continue;
    spent += Number(r.price) * r.qty;
    priced += Number(r.price) * r.qty;
    pricedQty += r.qty;
  }

  return {
    spent,
    // What one more would cost, from what has actually been paid. Null rather
    // than zero when nothing has a price — zero would be a claim.
    unitPrice: pricedQty > 0 ? Math.round(priced / pricedQty) : null,
  };
}
