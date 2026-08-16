import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  bandTimingLabel,
  countdownLine,
  currentBand,
  type AgeBand,
} from "./age";
import { addMonths, daysBetween, monthsBetween, todayInHousehold } from "./dates";

const BANDS: AgeBand[] = [
  { id: 1, name: "Before the birth", sortOrder: 1, ageFromMonths: -9, ageToMonths: 0 },
  { id: 2, name: "0–3 months", sortOrder: 2, ageFromMonths: 0, ageToMonths: 3 },
  { id: 3, name: "3–6 months", sortOrder: 3, ageFromMonths: 3, ageToMonths: 6 },
  { id: 4, name: "6–12 months", sortOrder: 4, ageFromMonths: 6, ageToMonths: 12 },
  { id: 5, name: "School age", sortOrder: 5, ageFromMonths: 36, ageToMonths: null },
];

describe("plain dates", () => {
  it("does not drift across time zones", () => {
    // The bug this guards: a `date` column read through a local-zone Date in
    // any zone west of UTC+7 lands a day early.
    assert.equal(daysBetween("2026-08-15", "2026-10-14"), 60);
    assert.equal(daysBetween("2026-10-14", "2026-08-15"), -60);
  });

  it("clamps month arithmetic to the end of the month", () => {
    assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonths("2027-01-31", 1), "2027-02-28");
    assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  });

  it("counts months by calendar, not by dividing days", () => {
    assert.equal(monthsBetween("2026-10-14", "2026-11-13"), 0);
    assert.equal(monthsBetween("2026-10-14", "2026-11-14"), 1);
    assert.equal(monthsBetween("2026-10-14", "2027-10-14"), 12);
  });

  it("reads today in Jakarta, not in the server's zone", () => {
    // 2026-08-15T18:30Z is already the 16th in Jakarta (UTC+7).
    assert.equal(
      todayInHousehold(new Date("2026-08-15T18:30:00Z")),
      "2026-08-16",
    );
  });
});

describe("countdown line", () => {
  const beforeBirth = { dueDate: "2026-10-14", birthDate: null };

  it("says about, because the due date is an estimate", () => {
    assert.equal(countdownLine(beforeBirth, "2026-08-15"), "about 60 days to go");
    assert.equal(countdownLine(beforeBirth, "2026-10-13"), "about 1 day to go");
  });

  it("stays calm once the date passes with no birth recorded", () => {
    assert.equal(countdownLine(beforeBirth, "2026-10-14"), "any day now");
    assert.equal(countdownLine(beforeBirth, "2026-10-20"), "any day now");
  });

  it("becomes an age in the same slot, without changing shape", () => {
    const born = { dueDate: "2026-10-14", birthDate: "2026-10-09" };
    assert.equal(countdownLine(born, "2026-10-09"), "born today");
    assert.equal(countdownLine(born, "2026-10-12"), "3 days old");
    assert.equal(countdownLine(born, "2026-11-20"), "6 weeks old");
    assert.equal(countdownLine(born, "2027-04-09"), "6 months old");
    assert.equal(countdownLine(born, "2028-10-09"), "2 years old");
  });

  it("still counts down when the birth date is in the future", () => {
    // A birth date recorded ahead of time must not read as a negative age.
    const scheduled = { dueDate: "2026-10-14", birthDate: "2026-10-14" };
    assert.equal(countdownLine(scheduled, "2026-08-15"), "about 60 days to go");
  });
});

describe("band timing labels", () => {
  const origin = { dueDate: "2026-10-14", birthDate: null };

  it("derives real months from the origin", () => {
    assert.equal(bandTimingLabel(BANDS[1], origin), "Oct 2026 – Jan 2027");
    assert.equal(bandTimingLabel(BANDS[3], origin), "Apr 2027 – Oct 2027");
  });

  it("reads as open-ended on the last band", () => {
    assert.equal(bandTimingLabel(BANDS[4], origin), "Oct 2029 onwards");
  });

  it("reads as a deadline before the birth", () => {
    assert.equal(bandTimingLabel(BANDS[0], origin), "until Oct 2026");
  });

  it("re-derives from the birth date once it is known", () => {
    // The whole point: no label is wrong the day after the birth.
    const born = { dueDate: "2026-10-14", birthDate: "2026-11-02" };
    assert.equal(bandTimingLabel(BANDS[1], born), "Nov 2026 – Feb 2027");
  });
});

describe("current band", () => {
  const origin = { dueDate: "2026-10-14", birthDate: null };

  it("is the pre-birth band before the birth", () => {
    assert.equal(currentBand(BANDS, origin, "2026-08-15")?.name, "Before the birth");
  });

  it("moves on with the child", () => {
    const born = { dueDate: "2026-10-14", birthDate: "2026-10-14" };
    assert.equal(currentBand(BANDS, born, "2026-10-14")?.name, "0–3 months");
    assert.equal(currentBand(BANDS, born, "2027-01-14")?.name, "3–6 months");
    assert.equal(currentBand(BANDS, born, "2027-05-01")?.name, "6–12 months");
  });

  it("falls back rather than throwing on a gap", () => {
    // 12–36 months is not covered by this fixture. A screen she is reading
    // must not crash because the band list has a hole in it.
    const born = { dueDate: "2026-10-14", birthDate: "2026-10-14" };
    assert.ok(currentBand(BANDS, born, "2028-06-01"));
    assert.equal(currentBand([], born, "2028-06-01"), undefined);
  });
});
