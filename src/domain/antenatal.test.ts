import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  antenatalCadence,
  antenatalWeeks,
  dateOfWeek,
  proposeAntenatalSeries,
  weeksPregnant,
} from "./antenatal";
import {
  formatDayMonth,
  formatFullDate,
  formatMonthYear,
  formatTimeInHousehold,
  formatWeekdayDayMonth,
  instantFromHouseholdTime,
  plainDateInHousehold,
  relativeDayLabel,
  windowSentence,
} from "./dates";

const DUE = "2026-10-14";

describe("the antenatal pattern", () => {
  it("thins out exactly where the standard schedule does", () => {
    const weeks = antenatalWeeks();

    assert.deepEqual(
      weeks,
      [4, 8, 12, 16, 20, 24, 28, 30, 32, 34, 36, 37, 38, 39, 40],
      "every 4 weeks to 28, every 2 to 36, then weekly",
    );
  });

  it("counts back from the due date, so week 40 is the due date", () => {
    assert.equal(dateOfWeek(DUE, 40), DUE);
    assert.equal(dateOfWeek(DUE, 39), "2026-10-07");
    assert.equal(dateOfWeek(DUE, 36), "2026-09-16");
  });

  it("says how many weeks pregnant a day is", () => {
    assert.equal(weeksPregnant(DUE, DUE), 40);
    assert.equal(weeksPregnant(DUE, "2026-09-16"), 36);
  });

  it("proposes only the visits still ahead", () => {
    // Proposing a check-up for a fortnight ago is how a schedule stops being
    // believed.
    const series = proposeAntenatalSeries(DUE, "2026-08-16");

    assert.ok(series.length > 0);
    assert.ok(
      series.every((v) => v.on > "2026-08-16"),
      "nothing in the past",
    );
    assert.equal(series[0].week, 32, "the next one after 30 weeks pregnant");
    assert.equal(series[series.length - 1].week, 40);
  });

  it("proposes nothing once the due date has passed", () => {
    assert.deepEqual(proposeAntenatalSeries(DUE, "2026-10-20"), []);
  });

  it("says how often, rather than naming the rule", () => {
    assert.equal(antenatalCadence(20), "every 4 weeks");
    assert.equal(antenatalCadence(32), "every 2 weeks");
    assert.equal(antenatalCadence(38), "weekly from here to the birth");
  });
});

describe("saying when", () => {
  it("gives a period words as well as a shape", () => {
    // A different shape, never a different colour — and the shape is backed up
    // by saying it, because turning up on the wrong day is the failure.
    assert.equal(
      windowSentence("2026-09-10", "2026-09-24"),
      "Any day between 10 and 24 Sep",
    );
    assert.equal(
      windowSentence("2026-10-14", "2026-11-30"),
      "Any day between 14 Oct and 30 Nov",
    );
  });

  it("names tomorrow, because that is what the screen promotes on", () => {
    assert.equal(relativeDayLabel("2026-08-16", "2026-08-16"), "Today");
    assert.equal(relativeDayLabel("2026-08-17", "2026-08-16"), "Tomorrow");
    assert.equal(relativeDayLabel("2026-08-15", "2026-08-16"), "Yesterday");
    assert.equal(relativeDayLabel("2026-08-21", "2026-08-16"), null);
  });

  it("reads the clock in Jakarta, whatever zone the server is in", () => {
    // 10:00 in Jakarta is 03:00 UTC. A server in London must still say 10:00.
    assert.equal(
      formatTimeInHousehold(new Date("2026-08-16T03:00:00Z")),
      "10:00",
    );
  });
});

describe("month names", () => {
  it("abbreviates every month to three letters", () => {
    // Intl renders September as "Sept" in current ICU — four characters where
    // every other month is three, which overflows the 46px date tile and the
    // 112px compare column. The handoff writes "Sep" everywhere.
    const months = Array.from({ length: 12 }, (_, i) =>
      formatDayMonth(`2026-${String(i + 1).padStart(2, "0")}-15`).split(" ")[1],
    );

    assert.deepEqual(months, [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
    assert.ok(
      months.every((m) => m.length === 3),
      "a four-letter month breaks the fixed-width tiles",
    );
  });

  it("uses the same three letters everywhere a month is written", () => {
    assert.equal(formatDayMonth("2026-09-15"), "15 Sep");
    assert.equal(formatMonthYear("2026-09-15"), "Sep 2026");
    assert.equal(formatFullDate("2026-09-15"), "15 Sep 2026");
    assert.equal(formatWeekdayDayMonth("2026-09-15"), "Tue 15 Sep");
  });
});

describe("a time she typed", () => {
  it("means the clock in her kitchen, not the server's", () => {
    // 10:00 in Jakarta is 03:00 UTC. Reading it in the server's own zone is
    // how an appointment moves seven hours by being deployed.
    const at = instantFromHouseholdTime("2026-08-15", "10:00");
    assert.equal(at.toISOString(), "2026-08-15T03:00:00.000Z");
  });

  it("survives the round trip back to the screen", () => {
    for (const time of ["00:00", "07:30", "10:00", "16:45", "23:15"]) {
      const at = instantFromHouseholdTime("2026-08-15", time);
      assert.equal(
        formatTimeInHousehold(at),
        time,
        `${time} reads back as ${time}`,
      );
    }
  });

  it("keeps the date she picked, even near midnight", () => {
    // 00:30 Jakarta is 17:30 UTC the day before. The day she chose is the day
    // it must still fall on for her.
    const at = instantFromHouseholdTime("2026-08-15", "00:30");
    assert.equal(at.toISOString(), "2026-08-14T17:30:00.000Z");
    assert.equal(plainDateInHousehold(at), "2026-08-15");
  });
});
