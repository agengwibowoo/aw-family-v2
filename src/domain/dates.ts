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

/**
 * Three letters, always.
 *
 * `Intl` renders September as "Sept" in current ICU, which is four characters
 * where every other month is three. That breaks the date block's fixed 46px
 * tile and the 112px compare column, and the handoff writes "Sep" everywhere.
 * Spelling twelve months out is cheaper than depending on the runtime's idea
 * of an abbreviation.
 */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthOf(d: PlainDate): string {
  return MONTHS[parse(d).m - 1];
}

function weekdayOf(d: PlainDate): string {
  return WEEKDAYS[new Date(toUtc(d)).getUTCDay()];
}

/** `15 Sep` */
export function formatDayMonth(d: PlainDate): string {
  return `${parse(d).day} ${monthOf(d)}`;
}

/** `Sep 2026` */
export function formatMonthYear(d: PlainDate): string {
  return `${monthOf(d)} ${parse(d).y}`;
}

/** `Tue 14 Aug` — the supporting line on Today. */
export function formatWeekdayDayMonth(d: PlainDate): string {
  return `${weekdayOf(d)} ${parse(d).day} ${monthOf(d)}`;
}

/** `15 Sep 2026` */
export function formatFullDate(d: PlainDate): string {
  const { day, y } = parse(d);
  return `${day} ${monthOf(d)} ${y}`;
}

/**
 * `10:00`, as the clock reads in the household's kitchen.
 *
 * An appointment is at ten in Jakarta whatever zone the server is in, so this
 * never goes through the runtime's local time.
 */
export function formatTimeInHousehold(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: HOUSEHOLD_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

/**
 * "10:00 on the 15th" as an instant.
 *
 * She types a wall-clock reading, and a wall clock in this household is in
 * Jakarta. Letting the runtime interpret it in the server's own zone is how an
 * appointment silently moves seven hours by being deployed — the same class of
 * bug the rest of this module avoids by never leaving the string.
 *
 * The offset is measured rather than assumed, so this stays correct if the app
 * is ever pointed at a household that does observe daylight saving.
 */
export function instantFromHouseholdTime(d: PlainDate, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Not a time: ${time}`);
  }

  // Start by reading the wall time as if it were UTC, then measure how far
  // that instant's Jakarta reading is from its UTC reading and step back.
  const asIfUtc = new Date(toUtc(d) + (hours * 60 + minutes) * 60_000);
  const offsetMs = householdOffsetAt(asIfUtc);
  return new Date(asIfUtc.getTime() - offsetMs);
}

/** How far ahead of UTC the household is at a given instant. */
function householdOffsetAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSEHOLD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return localAsUtc - instant.getTime();
}

/**
 * How a day reads relative to today: `Today`, `Tomorrow`, or its own name.
 *
 * Tomorrow is the word the Dates screen promotes an event out of the list on,
 * so it has to be the same idea of tomorrow the reader has.
 */
export function relativeDayLabel(d: PlainDate, today: PlainDate): string | null {
  const days = daysBetween(today, d);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return null;
}

/**
 * A period, said in words: "Any day between 10 and 24 Sep".
 *
 * A window gets a different shape from an appointment, never a different
 * colour — and the shape is backed up by saying it, because turning up on the
 * wrong day is the failure this prevents.
 */
export function windowSentence(from: PlainDate, to: PlainDate): string {
  const a = parse(from);
  const b = parse(to);

  if (a.y === b.y && a.m === b.m) {
    // Same month, so the month is said once: "between 10 and 24 Sep".
    return `Any day between ${a.day} and ${formatDayMonth(to)}`;
  }
  return `Any day between ${formatDayMonth(from)} and ${formatDayMonth(to)}`;
}
