/**
 * Plain-date arithmetic on `YYYY-MM-DD` strings.
 *
 * The database stores `date` columns with no time zone, and the household is in
 * Jakarta. Going through a JS `Date` in the server's local zone is how "due on
 * the 14th" becomes "due on the 13th" for anyone deployed outside UTC+7, so all
 * of this works on the string and never leaves it.
 */

export const HOUSEHOLD_TIME_ZONE = "Asia/Jakarta";

/** `YYYY-MM-DD`. */
export type PlainDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(d: PlainDate): { y: number; m: number; day: number } {
  const match = ISO.exec(d);
  if (!match) throw new Error(`Not a plain date: ${d}`);
  return { y: +match[1], m: +match[2], day: +match[3] };
}

function toUtc(d: PlainDate): number {
  const { y, m, day } = parse(d);
  return Date.UTC(y, m - 1, day);
}

function fromUtc(ms: number): PlainDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The calendar day an instant falls on in Jakarta. Timestamps come out of the
 * database as instants; every date a person reads is a day in their week.
 */
export function plainDateInHousehold(instant: Date): PlainDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSEHOLD_TIME_ZONE,
  }).format(instant);
}

/** Today, as the household experiences it, regardless of where this runs. */
export function todayInHousehold(now: Date = new Date()): PlainDate {
  return plainDateInHousehold(now);
}

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(d: PlainDate, days: number): PlainDate {
  return fromUtc(toUtc(d) + days * DAY_MS);
}

/**
 * Calendar months, clamped to the end of the target month — 31 Jan plus one
 * month is 28 Feb, not 3 March.
 */
export function addMonths(d: PlainDate, months: number): PlainDate {
  const { y, m, day } = parse(d);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return fromUtc(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(day, lastDay),
    ),
  );
}

/** Whole months elapsed, by calendar rather than by dividing days. */
export function monthsBetween(from: PlainDate, to: PlainDate): number {
  const a = parse(from);
  const b = parse(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.day < a.day) months -= 1;
  return months;
}

/* ---------------------------------------------------------------------------
   Formatting
   --------------------------------------------------------------------------- */

function fmt(d: PlainDate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" })
    .format(new Date(toUtc(d)))
    .replace(",", "");
}

/** `15 Sep` */
export function formatDayMonth(d: PlainDate): string {
  return fmt(d, { day: "numeric", month: "short" });
}

/** `Sep 2026` */
export function formatMonthYear(d: PlainDate): string {
  return fmt(d, { month: "short", year: "numeric" });
}

/** `Tue 14 Aug` — the supporting line on Today. */
export function formatWeekdayDayMonth(d: PlainDate): string {
  return fmt(d, { weekday: "short", day: "numeric", month: "short" });
}

/** `15 Sep 2026` */
export function formatFullDate(d: PlainDate): string {
  return fmt(d, { day: "numeric", month: "short", year: "numeric" });
}
