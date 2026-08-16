import {
  addMonths,
  daysBetween,
  formatMonthYear,
  monthsBetween,
  type PlainDate,
} from "./dates";

/**
 * Everything age-relative hangs off one origin: the birth date once it is
 * known, the due date until then. Nothing is stored pre-computed, which is why
 * a band added in three years needs no maintenance and why no label is ever
 * wrong the day after the birth.
 */

export type AgeBand = {
  id: number;
  name: string;
  sortOrder: number;
  ageFromMonths: number;
  /** Null on the last band, which is open-ended. */
  ageToMonths: number | null;
};

export type Origin = {
  dueDate: PlainDate;
  birthDate: PlainDate | null;
};

export function originDate({ dueDate, birthDate }: Origin): PlainDate {
  return birthDate ?? dueDate;
}

/** Negative before the origin. */
export function ageInMonths(origin: Origin, today: PlainDate): number {
  return monthsBetween(originDate(origin), today);
}

/* ---------------------------------------------------------------------------
   The countdown line
   --------------------------------------------------------------------------- */

/**
 * The line above the title on Today. Deliberately small: the due date is an
 * estimate, the birth will come sooner or later than the date, and a 42px
 * number would be the loudest and least reliable thing on the screen.
 *
 * The slot does not change shape on the due date, only its contents.
 */
export function countdownLine(origin: Origin, today: PlainDate): string {
  if (origin.birthDate && daysBetween(origin.birthDate, today) >= 0) {
    return ageLine(origin.birthDate, today);
  }

  const days = daysBetween(today, origin.dueDate);

  // Past the date with no birth recorded. It happens, and it is not an error.
  if (days <= 0) return "any day now";

  // "about", always: the date is an estimate and saying so is the point.
  if (days === 1) return "about 1 day to go";
  return `about ${days} days to go`;
}

function ageLine(birthDate: PlainDate, today: PlainDate): string {
  const days = daysBetween(birthDate, today);
  if (days < 1) return "born today";
  if (days === 1) return "1 day old";
  if (days < 14) return `${days} days old`;

  const weeks = Math.floor(days / 7);
  if (weeks < 13) return `${weeks} weeks old`;

  const months = monthsBetween(birthDate, today);
  if (months < 24) return months === 1 ? "1 month old" : `${months} months old`;

  const years = Math.floor(months / 12);
  return years === 1 ? "1 year old" : `${years} years old`;
}

/* ---------------------------------------------------------------------------
   Band labels and the current band
   --------------------------------------------------------------------------- */

export function bandRange(
  band: AgeBand,
  origin: Origin,
): { start: PlainDate; end: PlainDate | null } {
  const from = originDate(origin);
  return {
    start: addMonths(from, band.ageFromMonths),
    end: band.ageToMonths === null ? null : addMonths(from, band.ageToMonths),
  };
}

/**
 * When this band is, in real months — derived, never stored. The legacy table
 * held seven of these as text and every one of them was wrong the day after
 * the birth.
 */
export function bandTimingLabel(band: AgeBand, origin: Origin): string {
  const { start, end } = bandRange(band, origin);

  if (band.ageToMonths !== null && band.ageToMonths <= 0) {
    return `until ${formatMonthYear(end!)}`;
  }
  if (end === null) {
    return `${formatMonthYear(start)} onwards`;
  }
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}

/**
 * The band the child is in now. Bands are ordered, non-overlapping and cover
 * all of time, so exactly one matches — but the list comes from the database,
 * so fall back to the first rather than throwing on a screen she is reading.
 */
export function currentBand(
  bands: readonly AgeBand[],
  origin: Origin,
  today: PlainDate,
): AgeBand | undefined {
  if (bands.length === 0) return undefined;
  const months = ageInMonths(origin, today);

  const match = bands.find(
    (b) =>
      months >= b.ageFromMonths &&
      (b.ageToMonths === null || months < b.ageToMonths),
  );
  if (match) return match;

  const ordered = [...bands].sort((a, b) => a.sortOrder - b.sortOrder);
  return months < ordered[0].ageFromMonths
    ? ordered[0]
    : ordered[ordered.length - 1];
}
