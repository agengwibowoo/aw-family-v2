import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "../db";
import { hospitals, scheduleEvents } from "../schema";
import {
  plainDateInHousehold,
  todayInHousehold,
  type PlainDate,
} from "@/domain/dates";
import {
  antenatalCadence,
  dateOfWeek,
  proposeAntenatalSeries,
} from "@/domain/antenatal";

/**
 * What is happening, and when.
 *
 * An appointment has a time. A window has a period and no single right day
 * inside it — immunisations work that way, and a window shaped like an
 * appointment is how somebody turns up on a day that was never required.
 * Postgres holds that apart: an event has `starts_at`, or it has both window
 * columns, and never both or neither.
 */

export type EventRow = typeof scheduleEvents.$inferSelect;

/** One row on the Dates screen, with the day it sorts by already worked out. */
export type ScheduledEvent = EventRow & {
  /** The day this sorts and groups by — the start of a window, or the date of
      the appointment as the household experiences it. */
  onDate: PlainDate;
  isWindow: boolean;
  hospitalName: string | null;
};

function decorate(
  row: EventRow & { hospitalName: string | null },
): ScheduledEvent {
  const isWindow = row.startsAt === null;
  return {
    ...row,
    isWindow,
    onDate: isWindow
      ? (row.windowStart as PlainDate)
      : plainDateInHousehold(row.startsAt!),
  };
}

/**
 * Been and gone: it happened, or nobody went.
 *
 * Taken off is deliberately not in here. A date that did not happen has no
 * business in a list that means it did.
 */
function hasHappened(e: ScheduledEvent): boolean {
  return e.status === "done" || e.status === "missed";
}

/** Taken off the list — not happening, and not deleted either. */
function isOff(e: ScheduledEvent): boolean {
  return e.status === "cancelled";
}

export async function listEvents(
  opts: { from?: PlainDate; done?: boolean; off?: boolean } = {},
): Promise<ScheduledEvent[]> {
  const rows = await db
    .select({
      event: scheduleEvents,
      hospitalName: hospitals.name,
    })
    .from(scheduleEvents)
    .leftJoin(hospitals, eq(hospitals.id, scheduleEvents.hospitalId))
    .orderBy(asc(scheduleEvents.startsAt), asc(scheduleEvents.windowStart));

  const all = rows.map((r) =>
    decorate({ ...r.event, hospitalName: r.hospitalName }),
  );

  // Each option left out means "no opinion", so a bare call is still everything.
  const filtered = all
    .filter((e) => (opts.done === undefined ? true : opts.done === hasHappened(e)))
    .filter((e) => (opts.off === undefined ? true : opts.off === isOff(e)));

  return opts.from
    ? filtered.filter((e) => e.onDate >= opts.from!)
    : filtered;
}

/**
 * What is still ahead, what has been and gone, and what came off the list.
 *
 * The past collapses to one row that says what is in it — an archive, not a
 * truncation. It is where the scan photos live, which is the real reason
 * anybody goes back.
 *
 * Three buckets rather than two, because a date that is not happening belongs
 * in neither of the first ones: it is not coming up, and filing it under "been
 * and done" would say it happened.
 */
export async function datesScreen(today: PlainDate = todayInHousehold()) {
  const all = await listEvents();

  const off = all.filter(isOff);

  const coming = all
    .filter((e) => !isOff(e) && !hasHappened(e) && endOf(e) >= today)
    .sort((a, b) => a.onDate.localeCompare(b.onDate));

  const past = all.filter(
    (e) => !isOff(e) && (hasHappened(e) || endOf(e) < today),
  );

  return {
    coming,
    past,
    off,
    withPhotos: past.filter((e) => (e.imagePaths?.length ?? 0) > 0).length,
  };
}

/** A window is still ahead until its last day has gone. */
function endOf(e: ScheduledEvent): PlainDate {
  return e.isWindow ? (e.windowEnd as PlainDate) : e.onDate;
}

export async function getEvent(id: string): Promise<ScheduledEvent | null> {
  const [row] = await db
    .select({ event: scheduleEvents, hospitalName: hospitals.name })
    .from(scheduleEvents)
    .leftJoin(hospitals, eq(hospitals.id, scheduleEvents.hospitalId))
    .where(eq(scheduleEvents.id, id));

  if (!row) return null;
  return decorate({ ...row.event, hospitalName: row.hospitalName });
}

/** The next one still ahead — the card on Today that is a fact, not a task. */
export async function nextEvent(
  today: PlainDate = todayInHousehold(),
): Promise<ScheduledEvent | null> {
  const { coming } = await datesScreen(today);
  return coming[0] ?? null;
}

/* ---------------------------------------------------------------------------
   Writing
   --------------------------------------------------------------------------- */

export type NewEvent = {
  type: string;
  title: string;
  /** An appointment. Mutually exclusive with the window, held in Postgres. */
  startsAt?: Date | null;
  windowStart?: PlainDate | null;
  windowEnd?: PlainDate | null;
  hospitalId?: string | null;
  locationText?: string | null;
  practitioner?: string | null;
  attendees?: string[] | null;
  prepNotes?: string | null;
  costIdr?: number | null;
  source?: "manual" | "antenatal_pattern" | "idai_schedule" | "import";
};

function shapeOf(input: NewEvent) {
  const hasTime = input.startsAt != null;
  const hasWindow = input.windowStart != null && input.windowEnd != null;

  if (hasTime === hasWindow) {
    throw new Error(
      "Something happens at a time or over a period, never both and never neither.",
    );
  }

  return hasTime
    ? { startsAt: input.startsAt!, windowStart: null, windowEnd: null }
    : {
        startsAt: null,
        windowStart: input.windowStart!,
        windowEnd: input.windowEnd!,
      };
}

export async function createEvent(
  input: NewEvent,
  by: string,
): Promise<string> {
  const child = await db.query.children.findFirst();

  const [created] = await db
    .insert(scheduleEvents)
    .values({
      childId: child?.id ?? null,
      type: input.type,
      title: input.title.trim(),
      ...shapeOf(input),
      hospitalId: input.hospitalId ?? null,
      locationText: input.locationText ?? null,
      practitioner: input.practitioner ?? null,
      attendees: input.attendees ?? null,
      prepNotes: input.prepNotes ?? null,
      costIdr: input.costIdr?.toString() ?? null,
      source: input.source ?? "manual",
      createdBy: by,
      updatedBy: by,
    })
    .returning({ id: scheduleEvents.id });

  return created.id;
}

export async function updateEvent(
  id: string,
  patch: Partial<NewEvent> & { outcomeNotes?: string | null },
  by: string,
): Promise<void> {
  const set: Record<string, unknown> = {
    updatedBy: by,
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.locationText !== undefined) set.locationText = patch.locationText;
  if (patch.practitioner !== undefined) set.practitioner = patch.practitioner;
  if (patch.prepNotes !== undefined) set.prepNotes = patch.prepNotes;
  if (patch.outcomeNotes !== undefined) set.outcomeNotes = patch.outcomeNotes;
  if (patch.hospitalId !== undefined) set.hospitalId = patch.hospitalId;
  if (patch.attendees !== undefined) set.attendees = patch.attendees;
  if (patch.costIdr !== undefined) {
    set.costIdr = patch.costIdr === null ? null : patch.costIdr.toString();
  }

  // Changing when means changing shape, and the shape is a check constraint.
  if (
    patch.startsAt !== undefined ||
    patch.windowStart !== undefined ||
    patch.windowEnd !== undefined
  ) {
    Object.assign(
      set,
      shapeOf({
        type: patch.type ?? "other",
        title: patch.title ?? "",
        startsAt: patch.startsAt,
        windowStart: patch.windowStart,
        windowEnd: patch.windowEnd,
      }),
    );
    // A hand-edited event stops being a generated one, so regenerating never
    // overwrites a decision somebody made.
    set.source = "manual";
  }

  await db.update(scheduleEvents).set(set).where(eq(scheduleEvents.id, id));
}

export async function markDone(
  id: string,
  outcomeNotes: string | null,
  by: string,
): Promise<void> {
  await db
    .update(scheduleEvents)
    .set({
      status: "done",
      ...(outcomeNotes !== null ? { outcomeNotes } : {}),
      updatedBy: by,
      updatedAt: new Date(),
    })
    .where(eq(scheduleEvents.id, id));
}

/**
 * A window gets a day.
 *
 * One of the two honest endings for a period: either it happened, or you now
 * know which day it is happening on. Setting a day turns it into an
 * appointment, which is a change of shape as well as of value.
 */
export async function setWindowDay(
  id: string,
  startsAt: Date,
  by: string,
): Promise<void> {
  await db
    .update(scheduleEvents)
    .set({
      startsAt,
      windowStart: null,
      windowEnd: null,
      source: "manual",
      updatedBy: by,
      updatedAt: new Date(),
    })
    .where(eq(scheduleEvents.id, id));
}

/**
 * "This is not happening."
 *
 * Soft, and for the reason ADR-0008 gives about places: the fifteen-minute Undo
 * card is the app's only safety mechanism, and a hard delete cannot be undone,
 * so it would have to grow a confirm dialog. It also carries the scan photos and
 * the note, which are the two things anybody ever comes back for.
 *
 * No guard and no transaction. Unlike the picked place there is nothing
 * downstream that a date holds up, and nothing underneath the row is touched —
 * which is what makes putting it back cost nothing.
 */
export async function takeEventOff(id: string, by: string): Promise<void> {
  await db
    .update(scheduleEvents)
    .set({ status: "cancelled", updatedBy: by, updatedAt: new Date() })
    .where(eq(scheduleEvents.id, id));
}

/**
 * Put it back, with everything it ever knew.
 *
 * Back to `planned` rather than to whatever it was: nothing in the app ever
 * writes `confirmed`, so there is no earlier state to lose.
 */
export async function putEventBack(id: string, by: string): Promise<void> {
  await db
    .update(scheduleEvents)
    .set({ status: "planned", updatedBy: by, updatedAt: new Date() })
    .where(eq(scheduleEvents.id, id));
}

/* ---------------------------------------------------------------------------
   The antenatal pattern
   --------------------------------------------------------------------------- */

/** What would be created, without creating it. Nobody accepts a blind offer. */
export async function previewAntenatalSeries(
  today: PlainDate = todayInHousehold(),
) {
  const child = await db.query.children.findFirst();
  if (!child) return [];

  const existing = await db
    .select({ id: scheduleEvents.id })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.source, "antenatal_pattern"))
    .limit(1);

  if (existing.length > 0) return [];

  return proposeAntenatalSeries(child.dueDate, today).map((v) => ({
    ...v,
    cadence: antenatalCadence(v.week),
  }));
}

/**
 * Fifteen appointments in one tap.
 *
 * Created as windows rather than times: the pattern says which week, and the
 * clinic says which day and hour. A generated time nobody agreed to would be a
 * fact the app invented.
 */
export async function createAntenatalSeries(
  by: string,
  today: PlainDate = todayInHousehold(),
): Promise<number> {
  const child = await db.query.children.findFirst();
  if (!child) return 0;

  const visits = proposeAntenatalSeries(child.dueDate, today);
  if (visits.length === 0) return 0;

  await db.insert(scheduleEvents).values(
    visits.map((v) => ({
      childId: child.id,
      type: "antenatal",
      title: "Kontrol kandungan",
      startsAt: null,
      // The week, not the day. Ring them to book a slot inside it.
      windowStart: v.on,
      windowEnd: dateOfWeek(child.dueDate, v.week + 1),
      prepNotes: null,
      source: "antenatal_pattern" as const,
      sourceVersion: `${v.week} weeks`,
      createdBy: by,
      updatedBy: by,
    })),
  );

  return visits.length;
}
