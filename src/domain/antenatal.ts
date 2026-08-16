import { addDays, daysBetween, type PlainDate } from "./dates";

/**
 * The antenatal pattern.
 *
 * Every four weeks to twenty-eight, every two weeks to thirty-six, then weekly
 * to the birth. It is a well-known schedule and it is fifteen appointments —
 * nobody should have to type fifteen appointments, so the whole series is
 * proposed in one tap from the due date.
 *
 * A proposal, not a booking: these are the weeks the check-ups fall in, and the
 * actual days get moved once the clinic says so. Nothing here is medical
 * instruction.
 */

/** Forty weeks, counting back from the due date. */
const TERM_WEEKS = 40;

export type ProposedVisit = {
  /** Weeks pregnant on that day. */
  week: number;
  on: PlainDate;
};

/** The weeks a check-up falls in, under the standard pattern. */
export function antenatalWeeks(): number[] {
  const weeks: number[] = [];
  for (let w = 4; w <= 28; w += 4) weeks.push(w);
  for (let w = 30; w <= 36; w += 2) weeks.push(w);
  for (let w = 37; w <= TERM_WEEKS; w += 1) weeks.push(w);
  return weeks;
}

/** The day a given week of pregnancy falls on, for this due date. */
export function dateOfWeek(dueDate: PlainDate, week: number): PlainDate {
  return addDays(dueDate, -(TERM_WEEKS - week) * 7);
}

/** How many weeks pregnant on a given day. */
export function weeksPregnant(dueDate: PlainDate, on: PlainDate): number {
  return TERM_WEEKS - Math.ceil(daysBetween(on, dueDate) / 7);
}

/**
 * The visits still ahead.
 *
 * Past weeks are dropped rather than proposed and immediately marked done —
 * proposing a check-up for a fortnight ago is how a schedule stops being
 * believed.
 */
export function proposeAntenatalSeries(
  dueDate: PlainDate,
  today: PlainDate,
): ProposedVisit[] {
  return antenatalWeeks()
    .map((week) => ({ week, on: dateOfWeek(dueDate, week) }))
    .filter((v) => daysBetween(today, v.on) > 0);
}

/** What the row says about how often, in her words. */
export function antenatalCadence(week: number): string {
  if (week < 28) return "every 4 weeks";
  if (week < 36) return "every 2 weeks";
  return "weekly from here to the birth";
}
