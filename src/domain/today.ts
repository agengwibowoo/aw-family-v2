import { daysBetween, formatDayMonth, type PlainDate } from "./dates";

/**
 * What needs doing today.
 *
 * At most three things to *do*, ranked deterministically so "why is this here?"
 * always has an answer. The order is not a score and not a guess: it is three
 * tiers with fixed tie-breaks, and it is worth keeping that way — a card she
 * cannot account for is a card she stops trusting.
 *
 * The appointment card is a fact rather than a task. It has no "Later" and it
 * does not count against the three, because there is nothing to decide about a
 * check-up that is already booked.
 */

/** The two priorities that can reach Today. `Optional` never does. */
const ESSENTIAL = 1;
const RECOMMENDED = 2;

/** How close a band's deadline has to be to jump the queue. */
const URGENT_DAYS = 30;

export type Candidate = {
  id: string;
  name: string;
  have: number;
  need: number;
  bandId: number;
  bandName: string;
  bandSortOrder: number;
  categorySortOrder: number;
  prioritySortOrder: number;
  status: "still_need" | "got_it" | "more_than_enough";
};

export type TodayCard = {
  id: string;
  title: string;
  reason: string;
  /** 1 is a deadline inside thirty days; 3 is a nice-to-have in this band. */
  tier: number;
};

export function rankTodayCards(
  candidates: readonly Candidate[],
  {
    currentBandId,
    bandDeadlines,
    today,
    dismissed = new Set<string>(),
    limit = 3,
  }: {
    currentBandId: number | undefined;
    /** Band id to the day its things are wanted by. */
    bandDeadlines: Map<number, PlainDate | null>;
    today: PlainDate;
    dismissed?: ReadonlySet<string>;
    limit?: number;
  },
): TodayCard[] {
  const tierOf = (c: Candidate): number | null => {
    if (c.status !== "still_need") return null;

    const deadline = bandDeadlines.get(c.bandId) ?? null;
    const daysLeft = deadline ? daysBetween(today, deadline) : null;
    const urgent =
      daysLeft !== null && daysLeft >= 0 && daysLeft <= URGENT_DAYS;

    // A deadline inside a month outranks the band you happen to be in — that
    // is the whole reason the first tier is not simply "this band".
    if (c.prioritySortOrder <= ESSENTIAL && urgent) return 1;
    if (c.prioritySortOrder <= ESSENTIAL && c.bandId === currentBandId) return 2;
    if (c.prioritySortOrder <= RECOMMENDED && c.bandId === currentBandId) {
      return 3;
    }
    return null;
  };

  return candidates
    .filter((c) => !dismissed.has(c.id))
    .map((c) => ({ c, tier: tierOf(c) }))
    .filter((x): x is { c: Candidate; tier: number } => x.tier !== null)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        // Fixed tie-breaks, so the same data always produces the same order.
        a.c.bandSortOrder - b.c.bandSortOrder ||
        a.c.categorySortOrder - b.c.categorySortOrder ||
        a.c.name.localeCompare(b.c.name),
    )
    .slice(0, limit)
    .map(({ c, tier }) => ({
      id: c.id,
      title: cardTitle(c),
      reason: cardReason(c, bandDeadlines.get(c.bandId) ?? null),
      tier,
    }));
}

/** "Get 8 more newborn nappies" — how many, and of what. */
function cardTitle(c: Candidate): string {
  const short = Math.max(0, c.need - c.have);
  // The name is data and stays in whatever language it was typed in; only the
  // sentence around it is English.
  return `Get ${short} more ${c.name.toLowerCase()}`;
}

/** One line saying why this is in front of her right now. */
function cardReason(c: Candidate, deadline: PlainDate | null): string {
  return deadline
    ? `${c.bandName} · wanted by ${formatDayMonth(deadline)}`
    : c.bandName;
}

/**
 * The sentence under "Nothing needs doing today."
 *
 * It has to consult the real counts. "The hospital bag is done" over a 38% bar
 * is the one thing this screen cannot say, so a finished band and an unfinished
 * one get genuinely different sentences rather than one hopeful one.
 */
export function nothingToDoLine({
  bandName,
  got,
  things,
  nextDeadline,
  nextDateOn,
}: {
  bandName: string | null;
  got: number;
  things: number;
  /** When the next lot is wanted by. */
  nextDeadline: PlainDate | null;
  /** The next thing in the diary. */
  nextDateOn: PlainDate | null;
}): string {
  const nextDate = nextDateOn ? ` Next date ${formatDayMonth(nextDateOn)}.` : "";

  if (things === 0) {
    return bandName
      ? `Nothing on the list yet for ${bandName}.${nextDate}`
      : `Nothing on the list yet.${nextDate}`;
  }

  const outstanding = things - got;

  if (outstanding === 0) {
    const nextLot = nextDeadline
      ? ` Next thing due ${formatDayMonth(nextDeadline)}.`
      : "";
    return `${bandName ?? "This lot"} is done.${nextLot}${nextDate}`;
  }

  return `${outstanding} ${outstanding === 1 ? "thing" : "things"} still to get, none of them urgent yet.${nextDate}`;
}
