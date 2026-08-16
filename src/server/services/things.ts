import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db";
import {
  ageBands,
  categories,
  children,
  itemCandidates,
  itemMaterials,
  itemUnits,
  items,
  links,
  materials,
  priorities,
  purchases,
} from "../schema";
import { itemStatus, type ItemStatus } from "@/domain/status";
import { matchesName } from "@/domain/search";

/**
 * The things the household needs, and what it actually has.
 *
 * A thing is a need, not an object: "Bottles" is the reason bottles get bought,
 * and the bottles themselves are units. That distinction is why the count here
 * is always `count(units where retired_on is null)` and never the sum of
 * purchases — a gift has no receipt, a hand-me-down has no receipt, and a
 * broken bottle still has one (ADR-0003).
 *
 * `items.owned_qty` exists only so the generated `status` column can be
 * computed in Postgres. It is a cache, written by syncOwnedQtyFromUnits inside
 * the same transaction as every unit write, and nothing here reads it for a
 * fresh count.
 */

export type Thing = typeof items.$inferSelect;
export type Candidate = typeof itemCandidates.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;

/** One row on the list. Three facts and nothing else. */
export type ThingRowData = {
  id: string;
  name: string;
  have: number;
  need: number;
  status: ItemStatus;
  giftable: boolean;
  categoryName: string;
  bandId: number;
  bandName: string;
  bandSortOrder: number;
  categorySortOrder: number;
  priorityName: string;
  prioritySortOrder: number;
  /** Only shown where she is identifying, never where she is scanning. */
  imagePath: string | null;
};

/** The live count for a thing, straight from its units. */
const liveCount = sql<number>`(
  select count(*)::int from ${itemUnits}
  where ${itemUnits.itemId} = ${items.id} and ${itemUnits.retiredOn} is null
)`;

const ROW_COLUMNS = {
  id: items.id,
  name: items.name,
  have: liveCount,
  need: items.targetQty,
  giftable: items.giftable,
  categoryName: categories.name,
  categorySortOrder: categories.sortOrder,
  bandId: ageBands.id,
  bandName: ageBands.name,
  bandSortOrder: ageBands.sortOrder,
  priorityName: priorities.name,
  prioritySortOrder: priorities.sortOrder,
  imagePaths: items.imagePaths,
};

type RawRow = {
  id: string;
  name: string;
  have: number;
  need: number;
  giftable: boolean;
  categoryName: string;
  categorySortOrder: number;
  bandId: number;
  bandName: string;
  bandSortOrder: number;
  priorityName: string;
  prioritySortOrder: number;
  imagePaths: string[] | null;
};

function toRow(r: RawRow): ThingRowData {
  return {
    id: r.id,
    name: r.name,
    have: r.have,
    need: r.need,
    status: itemStatus(r.have, r.need),
    giftable: r.giftable,
    categoryName: r.categoryName,
    categorySortOrder: r.categorySortOrder,
    bandId: r.bandId,
    bandName: r.bandName,
    bandSortOrder: r.bandSortOrder,
    priorityName: r.priorityName,
    prioritySortOrder: r.prioritySortOrder,
    imagePath: r.imagePaths?.[0] ?? null,
  };
}

/**
 * The things, optionally narrowed.
 *
 * There is no unfiltered "everything" default on any screen: the list opens on
 * the band you are in, which is about eleven rows, and that is the entire
 * answer to why it never needs a filter bar.
 */
export async function listThings(
  opts: {
    bandId?: number;
    giftableOnly?: boolean;
    includeArchived?: boolean;
    /** Archived only — "don't need any more" is its own destination. */
    archivedOnly?: boolean;
  } = {},
): Promise<ThingRowData[]> {
  const where = [
    opts.archivedOnly
      ? sql`${items.archivedAt} is not null`
      : opts.includeArchived
        ? undefined
        : isNull(items.archivedAt),
    opts.bandId !== undefined ? eq(items.ageBandId, opts.bandId) : undefined,
    opts.giftableOnly ? eq(items.giftable, true) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db
    .select(ROW_COLUMNS)
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(ageBands, eq(ageBands.id, items.ageBandId))
    .innerJoin(priorities, eq(priorities.id, items.priorityId))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(
      asc(ageBands.sortOrder),
      asc(priorities.sortOrder),
      asc(categories.sortOrder),
      asc(items.name),
    );

  return rows.map(toRow);
}

/**
 * Search, after synonym substitution.
 *
 * Matching happens in TypeScript rather than in SQL because the substitution
 * is the interesting half and it already lives in the domain. The catalog is a
 * few hundred rows; when that stops being true this becomes a trigram index,
 * not a different rule.
 */
export async function searchThings(query: string): Promise<ThingRowData[]> {
  if (query.trim() === "") return [];
  const all = await listThings();
  return all.filter((t) => matchesName(t.name, query));
}

/** What the band progress card says, derived rather than stored. */
export async function bandProgress(
  bandId: number,
): Promise<{ have: number; need: number; things: number; got: number }> {
  const rows = await listThings({ bandId });
  return {
    have: rows.reduce((n, r) => n + Math.min(r.have, r.need), 0),
    need: rows.reduce((n, r) => n + r.need, 0),
    things: rows.length,
    got: rows.filter((r) => r.status !== "still_need").length,
  };
}

/** How many things are outside this band — the "show the other N" number. */
export async function countThings(
  opts: { bandId?: number; archived?: boolean } = {},
): Promise<number> {
  const where = [
    opts.archived
      ? sql`${items.archivedAt} is not null`
      : isNull(items.archivedAt),
    opts.bandId !== undefined ? eq(items.ageBandId, opts.bandId) : undefined,
  ].filter((c) => c !== undefined);

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(items)
    .where(and(...where));
  return row?.n ?? 0;
}

/**
 * One thing, with everything the screen shows.
 *
 * The three levels — the thing, what we're looking at, what we have — are
 * collapsed on screen into two lists in her words. She is never asked to
 * classify anything, and nothing here is called an option, a candidate or a
 * purchase where she can see it.
 */
export async function getThing(id: string) {
  const [row] = await db
    .select({
      ...ROW_COLUMNS,
      categoryId: items.categoryId,
      priorityId: items.priorityId,
      promptsMaterials: categories.promptsMaterials,
      description: items.description,
      notes: items.notes,
      brandSuggestions: items.brandSuggestions,
      storeSuggestions: items.storeSuggestions,
      archivedAt: items.archivedAt,
      archivedReason: items.archivedReason,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(ageBands, eq(ageBands.id, items.ageBandId))
    .innerJoin(priorities, eq(priorities.id, items.priorityId))
    .where(eq(items.id, id));

  if (!row) return null;

  const [candidateRows, purchaseRows, linkRows, materialRows] =
    await Promise.all([
      db
        .select()
        .from(itemCandidates)
        .where(eq(itemCandidates.itemId, id))
        .orderBy(asc(itemCandidates.decision), asc(itemCandidates.brand)),
      db
        .select()
        .from(purchases)
        .where(eq(purchases.itemId, id))
        .orderBy(desc(purchases.boughtOn), desc(purchases.createdAt)),
      db.select().from(links).where(eq(links.itemId, id)),
      db
        .select({
          id: itemMaterials.id,
          name: materials.name,
          role: itemMaterials.role,
          commonlyIrritant: materials.commonlyIrritant,
        })
        .from(itemMaterials)
        .innerJoin(materials, eq(materials.id, itemMaterials.materialId))
        .where(eq(itemMaterials.itemId, id)),
    ]);

  // How many of the units we have came from each receipt, so "4 of them" on a
  // line is the number still in the house rather than the number once bought.
  const liveByPurchase = await db
    .select({
      purchaseId: itemUnits.purchaseId,
      n: sql<number>`count(*)::int`,
    })
    .from(itemUnits)
    .where(and(eq(itemUnits.itemId, id), isNull(itemUnits.retiredOn)))
    .groupBy(itemUnits.purchaseId);

  const liveBy = new Map(liveByPurchase.map((r) => [r.purchaseId, r.n]));

  return {
    thing: toRow(row),
    detail: {
      categoryId: row.categoryId,
      priorityId: row.priorityId,
      promptsMaterials: row.promptsMaterials,
      description: row.description,
      notes: row.notes,
      brandSuggestions: row.brandSuggestions,
      storeSuggestions: row.storeSuggestions,
      archivedAt: row.archivedAt,
      archivedReason: row.archivedReason,
    },
    candidates: candidateRows,
    purchases: purchaseRows.map((p) => ({
      ...p,
      /** Still in the house, not merely once bought. */
      stillHave: liveBy.get(p.id) ?? 0,
    })),
    /** Units that arrived with no receipt: gifts and hand-me-downs. */
    unattributed: liveBy.get(null) ?? 0,
    links: linkRows,
    materials: materialRows,
  };
}

/* ---------------------------------------------------------------------------
   Writing
   --------------------------------------------------------------------------- */

export type NewThing = {
  name: string;
  targetQty: number;
  categoryId: number;
  ageBandId: number;
  priorityId?: number;
  giftable?: boolean;
  description?: string | null;
  notes?: string | null;
  brandSuggestions?: string | null;
  storeSuggestions?: string | null;
};

/**
 * A thing can exist with a name and a number.
 *
 * Everything else on the form is explicitly optional, so the defaults here have
 * to be real answers rather than placeholders: the least important priority,
 * and the tracking flags the category says are normal for its kind.
 */
export async function createThing(input: NewThing, by: string): Promise<string> {
  const child = await db.query.children.findFirst();
  if (!child) {
    throw new Error("There is no child record yet, so a thing has nothing to hang off.");
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, input.categoryId),
  });

  const priorityId = input.priorityId ?? (await defaultPriorityId());

  const [created] = await db
    .insert(items)
    .values({
      childId: child.id,
      name: input.name.trim(),
      targetQty: input.targetQty,
      categoryId: input.categoryId,
      ageBandId: input.ageBandId,
      priorityId,
      giftable: input.giftable ?? false,
      description: input.description ?? null,
      notes: input.notes ?? null,
      brandSuggestions: input.brandSuggestions ?? null,
      storeSuggestions: input.storeSuggestions ?? null,
      // Defaulted from the category, overridable by the operator, never set by
      // the person recording day to day.
      tracksCycle: category?.defaultTracksCycle ?? false,
      tracksConsumption: category?.defaultTracksConsumption ?? false,
      tracksSize: category?.defaultTracksSize ?? false,
      createdBy: by,
      updatedBy: by,
    })
    .returning({ id: items.id });

  return created.id;
}

export async function updateThing(
  id: string,
  patch: Partial<NewThing>,
  by: string,
): Promise<void> {
  await db
    .update(items)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.targetQty !== undefined ? { targetQty: patch.targetQty } : {}),
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.ageBandId !== undefined ? { ageBandId: patch.ageBandId } : {}),
      ...(patch.priorityId !== undefined ? { priorityId: patch.priorityId } : {}),
      ...(patch.giftable !== undefined ? { giftable: patch.giftable } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.brandSuggestions !== undefined
        ? { brandSuggestions: patch.brandSuggestions }
        : {}),
      ...(patch.storeSuggestions !== undefined
        ? { storeSuggestions: patch.storeSuggestions }
        : {}),
      updatedBy: by,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id));
}

/**
 * "Don't need any more."
 *
 * Not deletion, and not a destructive act — it leaves the counts and the
 * default lists, and keeps its history, its prices and its links. It is an
 * ordinary action on the edit screen, not something behind a confirm.
 */
export async function archiveThing(
  id: string,
  reason: "outgrown" | "superseded" | "not_needed",
  by: string,
): Promise<void> {
  await db
    .update(items)
    .set({
      archivedAt: new Date(),
      archivedReason: reason,
      updatedBy: by,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id));
}

export async function unarchiveThing(id: string, by: string): Promise<void> {
  await db
    .update(items)
    // The pair check requires both to move together.
    .set({
      archivedAt: null,
      archivedReason: null,
      updatedBy: by,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id));
}

/* ---------------------------------------------------------------------------
   Ones we're looking at
   --------------------------------------------------------------------------- */

export async function createCandidate(
  input: {
    itemId: string;
    name?: string | null;
    brand?: string | null;
    whereToBuy?: string | null;
    link?: string | null;
    estPriceIdr?: number | null;
    notes?: string | null;
  },
  by: string,
): Promise<string> {
  const [created] = await db
    .insert(itemCandidates)
    .values({
      itemId: input.itemId,
      name: input.name ?? null,
      brand: input.brand ?? null,
      whereToBuy: input.whereToBuy ?? null,
      link: input.link ?? null,
      estPriceIdr: input.estPriceIdr?.toString() ?? null,
      notes: input.notes ?? null,
      createdBy: by,
      updatedBy: by,
    })
    .returning({ id: itemCandidates.id });
  return created.id;
}

/**
 * Picking one, or ruling one out.
 *
 * At most one can be picked, held by a partial unique index rather than by
 * application care — so the demotion has to happen in the same transaction or
 * the save fails in a way indistinguishable from a network error.
 *
 * Ruling one out never deletes it. His comparison work gets quieter, not gone.
 */
export async function setCandidateDecision(
  id: string,
  decision: "considering" | "picked" | "ruled_out",
  by: string,
  reason?: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ itemId: itemCandidates.itemId })
      .from(itemCandidates)
      .where(eq(itemCandidates.id, id));
    if (!candidate) return;

    if (decision === "picked") {
      await tx
        .update(itemCandidates)
        .set({ decision: "considering", updatedBy: by, updatedAt: new Date() })
        .where(
          and(
            eq(itemCandidates.itemId, candidate.itemId),
            eq(itemCandidates.decision, "picked"),
          ),
        );
    }

    await tx
      .update(itemCandidates)
      .set({
        decision,
        decisionReason: decision === "ruled_out" ? (reason ?? null) : null,
        updatedBy: by,
        updatedAt: new Date(),
      })
      .where(eq(itemCandidates.id, id));
  });
}

export async function deleteCandidate(id: string): Promise<void> {
  await db.delete(itemCandidates).where(eq(itemCandidates.id, id));
}

/* ---------------------------------------------------------------------------
   Reference data
   --------------------------------------------------------------------------- */

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function listPriorities() {
  return db.select().from(priorities).orderBy(asc(priorities.sortOrder));
}

export async function listMaterials() {
  return db.select().from(materials).orderBy(asc(materials.name));
}

async function defaultPriorityId(): Promise<number> {
  const rows = await db
    .select({ id: priorities.id })
    .from(priorities)
    .orderBy(desc(priorities.sortOrder))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("No priorities are seeded.");
  }
  return rows[0].id;
}

/** Used by the seed check and by anything that needs the household's child. */
export async function requireChildId(): Promise<string> {
  const child = await db.select({ id: children.id }).from(children).limit(1);
  if (child.length === 0) {
    throw new Error("There is no child record yet.");
  }
  return child[0].id;
}
