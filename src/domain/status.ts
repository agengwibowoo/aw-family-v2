/**
 * The words a person reads for where something stands.
 *
 * The database stores stable tokens; the English lives here. Every status is a
 * word, never a colour, and "More than enough" carries the same visual weight as
 * the others — ten of six nappies is good news.
 */

export type ItemStatus = "still_need" | "got_it" | "more_than_enough";

export const ITEM_STATUS_WORDS: Record<ItemStatus, string> = {
  still_need: "Still need this",
  got_it: "Got it",
  more_than_enough: "More than enough",
};

export type CandidateDecision = "considering" | "picked" | "ruled_out";

export const CANDIDATE_DECISION_WORDS: Record<CandidateDecision, string> = {
  considering: "Looking at it",
  picked: "Picked this one",
  ruled_out: "Ruled out",
};

export type HospitalDecision = "shortlisted" | "picked" | "ruled_out";

export const HOSPITAL_DECISION_WORDS: Record<HospitalDecision, string> = {
  shortlisted: "Shortlisted",
  picked: "Picked this one",
  ruled_out: "Ruled out",
};

/** What a blank says. Never a dash, never N/A, never a 0 standing in for
    unknown — a blank that could be misread as "no" is a bug. */
export const NOT_FILLED_IN = "not filled in";

export function itemStatus(ownedQty: number, targetQty: number): ItemStatus {
  if (ownedQty > targetQty) return "more_than_enough";
  if (ownedQty >= targetQty) return "got_it";
  return "still_need";
}

/**
 * Counts carry their frame: `4 of 12`, never `33%` alone.
 */
export function countOf(have: number, need: number): string {
  return `${have} of ${need}`;
}
