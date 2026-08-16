import "server-only";

import { eq, isNull, sql } from "drizzle-orm";

import { db } from "../db";
import {
  ageBands,
  categories,
  itemCandidates,
  itemUnits,
  items,
  priorities,
  purchases,
} from "../schema";

/**
 * Where the money went, and roughly what is left to spend.
 *
 * Two rules shape all of it. Percentages scope to the current band by default,
 * because "38% of everything you will ever buy" is not a number anybody can
 * act on. And every bar measures *things* rather than rupiah, which is why the
 * screen still works with money hidden — the bars are the part that survives.
 *
 * "Roughly" is meant literally: what one more would cost comes from what has
 * actually been paid, falling back to what a candidate was priced at. Where
 * nothing is priced it stays null rather than becoming zero, because zero is a
 * claim.
 */

export type Rollup = {
  /** Actually paid. */
  spent: number;
  /** What the outstanding count would cost at known prices. */
  stillToCome: number;
  /** True when some outstanding things have no price anywhere. */
  partial: boolean;
  things: number;
  got: number;
  have: number;
  need: number;
};

type Row = {
  itemId: string;
  bandId: number;
  bandName: string;
  bandSortOrder: number;
  categoryId: number;
  categoryName: string;
  categorySortOrder: number;
  priorityId: number;
  priorityName: string;
  prioritySortOrder: number;
  need: number;
  have: number;
  spent: number;
  /** What one more would cost, or null when nobody has priced it. */
  unitPrice: number | null;
};

/**
 * Every unarchived thing, with what has been spent on it and what one costs.
 *
 * One query rather than one per thing: the money screen holds every band at
 * once, and a few hundred round trips is the difference between a screen and a
 * spinner.
 */
async function moneyRows(): Promise<Row[]> {
  const spendByItem = db
    .select({
      itemId: purchases.itemId,
      spent: sql<string>`coalesce(sum(${purchases.pricePerUnitIdr} * ${purchases.qty}), 0)`.as(
        "spent",
      ),
      pricedQty: sql<number>`coalesce(sum(${purchases.qty}) filter (where ${purchases.pricePerUnitIdr} is not null), 0)::int`.as(
        "priced_qty",
      ),
      pricedTotal: sql<string>`coalesce(sum(${purchases.pricePerUnitIdr} * ${purchases.qty}) filter (where ${purchases.pricePerUnitIdr} is not null), 0)`.as(
        "priced_total",
      ),
    })
    .from(purchases)
    .groupBy(purchases.itemId)
    .as("spend");

  // What a candidate was priced at, as the fallback for a thing nobody has
  // bought yet. The cheapest one that is still in play.
  const guessByItem = db
    .select({
      itemId: itemCandidates.itemId,
      guess: sql<string>`min(${itemCandidates.estPriceIdr})`.as("guess"),
    })
    .from(itemCandidates)
    .where(sql`${itemCandidates.decision} <> 'ruled_out'`)
    .groupBy(itemCandidates.itemId)
    .as("guess");

  const rows = await db
    .select({
      itemId: items.id,
      bandId: ageBands.id,
      bandName: ageBands.name,
      bandSortOrder: ageBands.sortOrder,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySortOrder: categories.sortOrder,
      priorityId: priorities.id,
      priorityName: priorities.name,
      prioritySortOrder: priorities.sortOrder,
      need: items.targetQty,
      have: sql<number>`(
        select count(*)::int from ${itemUnits}
        where ${itemUnits.itemId} = ${items.id} and ${itemUnits.retiredOn} is null
      )`,
      spent: sql<string>`coalesce(${spendByItem.spent}, 0)`,
      pricedQty: sql<number>`coalesce(${spendByItem.pricedQty}, 0)`,
      pricedTotal: sql<string>`coalesce(${spendByItem.pricedTotal}, 0)`,
      guess: guessByItem.guess,
    })
    .from(items)
    .innerJoin(ageBands, eq(ageBands.id, items.ageBandId))
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(priorities, eq(priorities.id, items.priorityId))
    .leftJoin(spendByItem, eq(spendByItem.itemId, items.id))
    .leftJoin(guessByItem, eq(guessByItem.itemId, items.id))
    .where(isNull(items.archivedAt));

  return rows.map((r) => {
    const pricedQty = Number(r.pricedQty);
    const paidAverage =
      pricedQty > 0 ? Math.round(Number(r.pricedTotal) / pricedQty) : null;
    const guess = r.guess === null ? null : Number(r.guess);

    return {
      ...r,
      spent: Number(r.spent),
      // What has actually been paid beats what somebody hoped it would cost.
      unitPrice: paidAverage ?? guess,
    };
  });
}

function rollUp(rows: Row[]): Rollup {
  let spent = 0;
  let stillToCome = 0;
  let partial = false;
  let have = 0;
  let need = 0;
  let got = 0;

  for (const r of rows) {
    spent += r.spent;
    have += Math.min(r.have, r.need);
    need += r.need;
    if (r.have >= r.need) got += 1;

    const outstanding = Math.max(0, r.need - r.have);
    if (outstanding === 0) continue;

    if (r.unitPrice === null) partial = true;
    else stillToCome += r.unitPrice * outstanding;
  }

  return { spent, stillToCome, partial, things: rows.length, got, have, need };
}

export type MoneyScreen = {
  bands: {
    id: number;
    name: string;
    sortOrder: number;
    rollup: Rollup;
  }[];
  byCategory: { id: number; name: string; rollup: Rollup }[];
  byPriority: { id: number; name: string; rollup: Rollup }[];
  everything: Rollup;
};

/**
 * The whole screen, scoped or not.
 *
 * `bandId` is the default view: the current band. Passing nothing is the
 * explicit way out to all-time, which the screen offers as a link rather than
 * as a control you can leave in the wrong position.
 */
export async function moneyScreen(bandId?: number): Promise<MoneyScreen> {
  const all = await moneyRows();
  const scoped = bandId === undefined ? all : all.filter((r) => r.bandId === bandId);

  const group = <K extends string | number>(
    rows: Row[],
    key: (r: Row) => K,
    label: (r: Row) => string,
    order: (r: Row) => number,
  ) => {
    const buckets = new Map<K, { label: string; order: number; rows: Row[] }>();
    for (const r of rows) {
      const k = key(r);
      const bucket = buckets.get(k) ?? {
        label: label(r),
        order: order(r),
        rows: [],
      };
      bucket.rows.push(r);
      buckets.set(k, bucket);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id, b]) => ({ id, name: b.label, rollup: rollUp(b.rows) }));
  };

  return {
    bands: group(
      all,
      (r) => r.bandId,
      (r) => r.bandName,
      (r) => r.bandSortOrder,
    ).map((b) => ({ ...b, sortOrder: 0 })),
    byCategory: group(
      scoped,
      (r) => r.categoryId,
      (r) => r.categoryName,
      (r) => r.categorySortOrder,
    ),
    byPriority: group(
      scoped,
      (r) => r.priorityId,
      (r) => r.priorityName,
      (r) => r.prioritySortOrder,
    ),
    everything: rollUp(all),
  };
}
