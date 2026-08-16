import "server-only";

import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "../db";
import {
  documents,
  hospitalDocuments,
  hospitalInsurers,
  hospitalQuotes,
  hospitals,
  insurancePolicy,
} from "../schema";
import type { HospitalCover, Policy } from "@/domain/insurance";
import { notePickedHospitalForPapers } from "./papers";

export type Hospital = typeof hospitals.$inferSelect;
export type HospitalQuote = typeof hospitalQuotes.$inferSelect;
export type HospitalInsurer = typeof hospitalInsurers.$inferSelect;

/**
 * Candidate places to give birth.
 *
 * The interaction model deliberately mirrors picking a product: compare
 * candidates, mark one picked, the others go quiet. Exactly one picked, held by
 * a partial unique index rather than by application care.
 */

/** How many of the fields that decide the outcome are actually filled in. */
const COMPLETENESS_FIELDS = [
  "type",
  "address",
  "mapsUrl",
  "phone",
  "whatsapp",
  "website",
  "instagram",
  "distanceKm",
  "driveMinutesNormal",
  "driveMinutesPeak",
  "hasIgd24h",
  "hasNicu",
  "nicuLevel",
  "supportsImd",
  "roomingIn",
  "hasLactationConsultant",
  "allowsHusbandInRoom",
  "allowsPhotographer",
  "depositIdr",
  "notes",
] as const satisfies readonly (keyof Hospital)[];

export const COMPLETENESS_TOTAL = COMPLETENESS_FIELDS.length;

export function completeness(h: Hospital): number {
  return COMPLETENESS_FIELDS.filter((f) => {
    const v = h[f];
    // false is an answer. Null is not.
    return v !== null && v !== undefined && v !== "";
  }).length;
}

export async function listHospitals(): Promise<Hospital[]> {
  const rows = await db.select().from(hospitals).orderBy(asc(hospitals.name));

  // Picked, then shortlisted, then ruled out — where you are up to, not what
  // these places are.
  const rank = { picked: 0, shortlisted: 1, ruled_out: 2 } as const;
  return rows.sort(
    (a, b) =>
      rank[a.decision as keyof typeof rank] -
      rank[b.decision as keyof typeof rank],
  );
}

export async function getHospital(id: string) {
  const hospital = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, id),
  });
  if (!hospital) return null;

  const [quotes, insurers, papers] = await Promise.all([
    db
      .select()
      .from(hospitalQuotes)
      .where(eq(hospitalQuotes.hospitalId, id))
      .orderBy(asc(hospitalQuotes.deliveryType), asc(hospitalQuotes.roomClass)),
    db
      .select()
      .from(hospitalInsurers)
      .where(eq(hospitalInsurers.hospitalId, id)),
    db
      .select({
        documentId: hospitalDocuments.documentId,
        name: documents.name,
        required: hospitalDocuments.required,
        copiesRequired: hospitalDocuments.copiesRequired,
        notes: hospitalDocuments.notes,
      })
      .from(hospitalDocuments)
      .innerJoin(documents, eq(documents.id, hospitalDocuments.documentId))
      .where(eq(hospitalDocuments.hospitalId, id))
      .orderBy(asc(documents.sortOrder)),
  ]);

  return { hospital, quotes, insurers, papers };
}

/**
 * Every place, with everything comparing them needs, in one read.
 *
 * Compare is one screen holding four places at once, so it cannot afford a
 * query per place. Column order is the shortlist order — the picked place is
 * always first and ruled-out is off to the right where you have to go looking
 * for it.
 */
export type ComparedHospital = {
  hospital: Hospital;
  quotes: HospitalQuote[];
  insurers: HospitalInsurer[];
  /** How many papers this place asks for — part of comparing it. */
  paperCount: number;
  filled: number;
};

export async function listHospitalsForCompare(): Promise<ComparedHospital[]> {
  const rows = await listHospitals();
  if (rows.length === 0) return [];

  const ids = rows.map((h) => h.id);

  const [quotes, insurers, paperCounts] = await Promise.all([
    db
      .select()
      .from(hospitalQuotes)
      .where(inArray(hospitalQuotes.hospitalId, ids))
      .orderBy(asc(hospitalQuotes.deliveryType), asc(hospitalQuotes.roomClass)),
    db
      .select()
      .from(hospitalInsurers)
      .where(inArray(hospitalInsurers.hospitalId, ids)),
    db
      .select({
        hospitalId: hospitalDocuments.hospitalId,
        n: sql<number>`count(*)::int`,
      })
      .from(hospitalDocuments)
      .where(
        and(
          inArray(hospitalDocuments.hospitalId, ids),
          eq(hospitalDocuments.required, true),
        ),
      )
      .groupBy(hospitalDocuments.hospitalId),
  ]);

  const papersBy = new Map(paperCounts.map((p) => [p.hospitalId, p.n]));

  return rows.map((hospital) => ({
    hospital,
    quotes: quotes.filter((q) => q.hospitalId === hospital.id),
    insurers: insurers.filter((i) => i.hospitalId === hospital.id),
    paperCount: papersBy.get(hospital.id) ?? 0,
    filled: completeness(hospital),
  }));
}

export async function getPickedHospital(): Promise<Hospital | null> {
  const row = await db.query.hospitals.findFirst({
    where: eq(hospitals.decision, "picked"),
  });
  return row ?? null;
}

export async function createHospital(
  input: { name: string; address?: string | null },
  by: string,
): Promise<string> {
  const [row] = await db
    .insert(hospitals)
    .values({
      name: input.name,
      address: input.address ?? null,
      decision: "shortlisted",
      createdBy: by,
      updatedBy: by,
    })
    .returning({ id: hospitals.id });
  return row.id;
}

export async function updateHospital(
  id: string,
  patch: Partial<Omit<Hospital, "id" | "decision" | "createdAt" | "createdBy">>,
  by: string,
): Promise<void> {
  await db
    .update(hospitals)
    .set({ ...patch, updatedBy: by, updatedAt: new Date() })
    .where(eq(hospitals.id, id));
}

/**
 * Picking one demotes any other in the same transaction — the partial unique
 * index would otherwise reject the write, and a failed save on this screen is
 * indistinguishable from the app being broken.
 *
 * Ruling one out requires a reason, and it is never deleted.
 */
export async function setDecision(
  id: string,
  decision: "shortlisted" | "picked" | "ruled_out",
  by: string,
  reason?: string | null,
): Promise<void> {
  if (decision === "ruled_out" && !reason?.trim()) {
    throw new Error("Say why it was ruled out — it is kept, not deleted.");
  }

  await db.transaction(async (tx) => {
    if (decision === "picked") {
      await tx
        .update(hospitals)
        .set({ decision: "shortlisted", updatedBy: by, updatedAt: new Date() })
        .where(and(eq(hospitals.decision, "picked"), ne(hospitals.id, id)));
    }

    await tx
      .update(hospitals)
      .set({
        decision,
        decisionReason: decision === "ruled_out" ? reason!.trim() : null,
        updatedBy: by,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, id));
  });

  // The papers pack follows the picked place. Remembering which place it was
  // last scored against is what lets the screen name what changed rather than
  // silently re-scoring — and it happens here, on the write path, so a pick
  // made over MCP is tracked exactly like one made from a screen.
  if (decision === "picked") {
    await notePickedHospitalForPapers(id, by);
  }
}

/* ---------------------------------------------------------------------------
   Quotes and insurers
   --------------------------------------------------------------------------- */

export async function upsertQuote(
  input: {
    hospitalId: string;
    deliveryType: string;
    roomClass: string;
    priceIdr?: string | null;
    nightsIncluded?: number | null;
    includes?: string | null;
    excludes?: string | null;
    source?: string | null;
    quotedOn?: string | null;
  },
): Promise<void> {
  await db
    .insert(hospitalQuotes)
    .values(input)
    .onConflictDoUpdate({
      target: [
        hospitalQuotes.hospitalId,
        hospitalQuotes.deliveryType,
        hospitalQuotes.roomClass,
      ],
      set: {
        priceIdr: input.priceIdr ?? null,
        nightsIncluded: input.nightsIncluded ?? null,
        includes: input.includes ?? null,
        excludes: input.excludes ?? null,
        source: input.source ?? null,
        quotedOn: input.quotedOn ?? null,
      },
    });
}

export async function deleteQuote(id: string): Promise<void> {
  await db.delete(hospitalQuotes).where(eq(hospitalQuotes.id, id));
}

export async function upsertInsurer(
  input: typeof hospitalInsurers.$inferInsert,
): Promise<void> {
  await db.insert(hospitalInsurers).values(input);
}

export async function updateInsurer(
  id: string,
  patch: Partial<typeof hospitalInsurers.$inferInsert>,
): Promise<void> {
  await db.update(hospitalInsurers).set(patch).where(eq(hospitalInsurers.id, id));
}

export async function deleteInsurer(id: string): Promise<void> {
  await db.delete(hospitalInsurers).where(eq(hospitalInsurers.id, id));
}

/**
 * What this hospital asks you to bring.
 *
 * Replaces the whole set in one transaction rather than diffing: it is a short
 * list edited on one screen, and a half-applied requirement list is worse than
 * a slightly heavier write.
 */
export async function setHospitalDocuments(
  hospitalId: string,
  wanted: { documentId: number; copiesRequired: number; notes?: string | null }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(hospitalDocuments)
      .where(eq(hospitalDocuments.hospitalId, hospitalId));

    if (wanted.length === 0) return;

    await tx.insert(hospitalDocuments).values(
      wanted.map((w) => ({
        hospitalId,
        documentId: w.documentId,
        required: true,
        copiesRequired: w.copiesRequired,
        notes: w.notes ?? null,
      })),
    );
  });
}

/* ---------------------------------------------------------------------------
   The policy — one row for the household, not one per hospital
   --------------------------------------------------------------------------- */

export async function getPolicy(): Promise<Policy | null> {
  const row = await getPolicyRow();
  if (!row) return null;
  return {
    insurerName: row.insurerName,
    policyStartedOn: row.policyStartedOn,
    maternityWaitingPeriodMonths: row.maternityWaitingPeriodMonths,
    roomEntitlement: row.roomEntitlement,
  };
}

/**
 * Every field, for the screen that edits them. `getPolicy` deliberately
 * narrows to the four the verdict is computed from, so nothing else can grow a
 * dependency on the limits or the policy number by accident.
 */
export async function getPolicyRow() {
  return db.query.insurancePolicy.findFirst();
}

export async function savePolicy(
  patch: Partial<typeof insurancePolicy.$inferInsert>,
  by: string,
): Promise<void> {
  const existing = await db.query.insurancePolicy.findFirst();
  if (existing) {
    await db
      .update(insurancePolicy)
      .set({ ...patch, updatedBy: by, updatedAt: new Date() })
      .where(eq(insurancePolicy.id, existing.id));
    return;
  }
  await db
    .insert(insurancePolicy)
    .values({ ...patch, createdBy: by, updatedBy: by });
}

/** The hospital's own line on your insurer, if anyone has checked. */
export function coverFor(
  insurers: HospitalInsurer[],
  policy: Policy | null,
): HospitalCover | null {
  if (!policy?.insurerName) return null;
  const match = insurers.find(
    (i) => i.insurerName.toLowerCase() === policy.insurerName!.toLowerCase(),
  );
  if (!match) return null;
  return {
    insurerName: match.insurerName,
    accepted: match.accepted,
    settlement: match.settlement as "cashless" | "reimbursement" | null,
    requiresPreauth: match.requiresPreauth,
    preauthLeadDays: match.preauthLeadDays,
  };
}

/**
 * The cheapest normal-birth price we have been told, per place.
 *
 * The list screen shows one price per card, and it has to be the same kind of
 * price on every card or the cards cannot be read against each other. Normal
 * birth is the one everybody quotes, so it is the one that ranks.
 */
export async function cheapestNormalPrice(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      hospitalId: hospitalQuotes.hospitalId,
      priceIdr: sql<string>`min(${hospitalQuotes.priceIdr})`,
    })
    .from(hospitalQuotes)
    .where(
      and(
        eq(hospitalQuotes.deliveryType, "Normal"),
        isNotNull(hospitalQuotes.priceIdr),
      ),
    )
    .groupBy(hospitalQuotes.hospitalId);

  return new Map(rows.map((r) => [r.hospitalId, r.priceIdr]));
}

/** How many places are still in play — used for the "N ruled out" collapse. */
export async function hospitalCounts() {
  const rows = await db
    .select({
      decision: hospitals.decision,
      n: sql<number>`count(*)::int`,
    })
    .from(hospitals)
    .groupBy(hospitals.decision);
  return Object.fromEntries(rows.map((r) => [r.decision, r.n])) as Partial<
    Record<"picked" | "shortlisted" | "ruled_out", number>
  >;
}
