import assert from "node:assert/strict";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, describe, it } from "vitest";

import { db } from "../db";
import { scheduleEvents } from "../schema";
import {
  createEvent,
  datesScreen,
  getEvent,
  markDone,
  setWindowDay,
  updateEvent,
} from "./schedule";
import { instantFromHouseholdTime } from "@/domain/dates";

/**
 * When things happen, against the real database.
 *
 * The rule worth testing here is the one Postgres holds: something happens at a
 * time or over a period, never both and never neither. A window shaped like an
 * appointment is how somebody turns up on a day that was never required.
 */

const PREFIX = "ztest-";
const ACTOR = "00000000-0000-0000-0000-000000000000";
const created: string[] = [];

async function make(input: Parameters<typeof createEvent>[0]) {
  const id = await createEvent(
    { ...input, title: `${PREFIX}${input.title}` },
    ACTOR,
  );
  created.push(id);
  return id;
}

afterAll(async () => {
  if (created.length > 0) {
    await db.delete(scheduleEvents).where(inArray(scheduleEvents.id, created));
  }
  const leftovers = await db
    .select({ id: scheduleEvents.id })
    .from(scheduleEvents)
    .where(like(scheduleEvents.title, `${PREFIX}%`));
  assert.equal(leftovers.length, 0, "test dates were left behind");
});

describe("a time or a period, never both", () => {
  it("stores an appointment at the time she typed", async () => {
    const id = await make({
      type: "antenatal",
      title: "check-up",
      startsAt: instantFromHouseholdTime("2026-09-15", "10:00"),
    });

    const event = await getEvent(id);
    assert.ok(event);
    assert.equal(event.isWindow, false);
    // The day she picked is the day it falls on for her, not for the server.
    assert.equal(event.onDate, "2026-09-15");
    assert.equal(event.startsAt?.toISOString(), "2026-09-15T03:00:00.000Z");
  });

  it("stores a period with no single right day inside it", async () => {
    const id = await make({
      type: "immunisation",
      title: "hep B",
      windowStart: "2026-09-10",
      windowEnd: "2026-09-24",
    });

    const event = await getEvent(id);
    assert.ok(event);
    assert.equal(event.isWindow, true);
    assert.equal(event.startsAt, null);
    assert.equal(event.onDate, "2026-09-10");
  });

  it("refuses something that is both", async () => {
    await assert.rejects(
      () =>
        make({
          type: "other",
          title: "both",
          startsAt: instantFromHouseholdTime("2026-09-15", "10:00"),
          windowStart: "2026-09-10",
          windowEnd: "2026-09-24",
        }),
      /never both and never neither/,
    );
  });

  it("refuses something that is neither", async () => {
    await assert.rejects(
      () => make({ type: "other", title: "neither" }),
      /never both and never neither/,
    );
  });
});

describe("a period getting a day", () => {
  it("becomes an appointment, which is a change of shape", async () => {
    const id = await make({
      type: "immunisation",
      title: "bcg",
      windowStart: "2026-10-14",
      windowEnd: "2026-10-30",
    });

    await setWindowDay(id, instantFromHouseholdTime("2026-10-20", "09:30"), ACTOR);

    const event = await getEvent(id);
    assert.ok(event);
    assert.equal(event.isWindow, false, "it is an appointment now");
    assert.equal(event.windowStart, null);
    assert.equal(event.windowEnd, null);
    assert.equal(event.onDate, "2026-10-20");
  });

  it("stops being a generated one once somebody has moved it", async () => {
    // Regenerating must never overwrite a decision a person made.
    const id = await make({
      type: "antenatal",
      title: "generated",
      windowStart: "2026-09-01",
      windowEnd: "2026-09-08",
      source: "antenatal_pattern",
    });

    const [before] = await db
      .select({ source: scheduleEvents.source })
      .from(scheduleEvents)
      .where(eq(scheduleEvents.id, id));
    assert.equal(before.source, "antenatal_pattern");

    await updateEvent(
      id,
      { startsAt: instantFromHouseholdTime("2026-09-03", "11:00") },
      ACTOR,
    );

    const [after] = await db
      .select({ source: scheduleEvents.source })
      .from(scheduleEvents)
      .where(eq(scheduleEvents.id, id));
    assert.equal(after.source, "manual", "a hand-edited date is hers now");
  });
});

describe("what is still ahead", () => {
  it("keeps a period ahead until its last day has gone", async () => {
    const id = await make({
      type: "immunisation",
      title: "still-open",
      windowStart: "2026-09-01",
      windowEnd: "2026-09-30",
    });

    // Mid-period: still coming up, even though it started in the past.
    const mid = await datesScreen("2026-09-15");
    assert.ok(
      mid.coming.some((e) => e.id === id),
      "a period you are inside has not been and gone",
    );

    const after = await datesScreen("2026-10-01");
    assert.ok(
      after.past.some((e) => e.id === id),
      "and once the last day has gone, it has",
    );
  });

  it("moves a date to the past the moment it is done", async () => {
    const id = await make({
      type: "lab",
      title: "done-early",
      startsAt: instantFromHouseholdTime("2026-12-01", "08:00"),
    });

    const before = await datesScreen("2026-09-15");
    assert.ok(before.coming.some((e) => e.id === id));

    await markDone(id, "All fine.", ACTOR);

    const after = await datesScreen("2026-09-15");
    assert.ok(
      after.past.some((e) => e.id === id),
      "done is done, whatever the calendar says",
    );
  });
});
