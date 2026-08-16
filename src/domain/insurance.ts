import {
  addMonths,
  daysBetween,
  formatMonthYear,
  monthsBetween,
  type PlainDate,
} from "./dates";

/**
 * Whether this birth is paid for.
 *
 * Many Indonesian private policies impose a nine-to-twelve month maternity
 * waiting period, so a policy taken out after conception may not cover the
 * delivery at all. That is the single most consequential fact in the hospital
 * decision, and it is the one people discover at admission.
 *
 * So it is computed, and it is stated as sentences. Never "policy started
 * 3 Jun 2025 · wait 12 months" — that asks the reader to do arithmetic about
 * money while nine months pregnant.
 *
 * Unknown is a sentence too. Never an absence, never a blank, never a zero.
 */

export type Policy = {
  insurerName: string | null;
  policyStartedOn: PlainDate | null;
  maternityWaitingPeriodMonths: number | null;
  roomEntitlement: string | null;
};

export type HospitalCover = {
  insurerName: string;
  accepted: boolean | null;
  settlement: "cashless" | "reimbursement" | null;
  requiresPreauth: boolean | null;
  preauthLeadDays: number | null;
};

export type InsuranceVerdict = {
  kind: "covered" | "not_covered" | "not_accepted" | "unknown";
  /** The answer, on its own. Sized to be read from arm's length. */
  headline: string;
  /** Why, in one sentence. Omitted when the headline is the whole story. */
  reason?: string;
  /** What it means for you. Omitted when there is nothing to do. */
  consequence?: string;
};

/** When cover actually begins. */
export function coverStartsOn(policy: Policy): PlainDate | null {
  if (!policy.policyStartedOn) return null;
  const wait = policy.maternityWaitingPeriodMonths ?? 0;
  return addMonths(policy.policyStartedOn, wait);
}

export function assessCover(
  policy: Policy,
  dueDate: PlainDate,
  hospital?: HospitalCover | null,
): InsuranceVerdict {
  if (hospital && hospital.accepted === false) {
    return {
      kind: "not_accepted",
      headline: "This place doesn't take your insurance.",
      consequence: "You would be paying the whole bill yourselves.",
    };
  }

  const starts = coverStartsOn(policy);

  if (!starts || policy.maternityWaitingPeriodMonths === null) {
    return {
      kind: "unknown",
      headline: "Nobody has checked the insurance for this one.",
      reason: !policy.policyStartedOn
        ? "We haven't recorded when the policy started."
        : "We haven't recorded how long the maternity wait is.",
    };
  }

  const wait = policy.maternityWaitingPeriodMonths;
  const covered = daysBetween(starts, dueDate) >= 0;

  if (covered) {
    const margin = monthsBetween(starts, dueDate);
    return {
      kind: "covered",
      headline: "The birth should be covered.",
      reason:
        wait > 0
          ? `The ${wait}-month wait on your policy ended in ${formatMonthYear(starts)}, ${describeGap(margin)} the due date.`
          : `Your policy has no maternity wait.`,
      consequence: hospitalNote(hospital, policy),
    };
  }

  const shortfall = monthsBetween(dueDate, starts);
  return {
    kind: "not_covered",
    headline: "The birth would not be covered.",
    reason: `The ${wait}-month wait on your policy runs until ${formatMonthYear(starts)}, ${describeGap(shortfall)} the due date.`,
    consequence: "Plan to pay for the delivery yourselves.",
  };
}

function describeGap(months: number): string {
  if (months <= 0) return "right around";
  if (months === 1) return "a month before";
  if (months < 12) return `${months} months before`;
  const years = Math.round(months / 12);
  return years === 1 ? "a year before" : `${years} years before`;
}

function hospitalNote(
  hospital: HospitalCover | null | undefined,
  policy: Policy,
): string | undefined {
  if (!hospital) {
    return policy.roomEntitlement
      ? `Your policy covers a ${policy.roomEntitlement} room. Choosing above it means paying the difference on everything, not just the room.`
      : undefined;
  }

  const parts: string[] = [];

  if (hospital.settlement === "reimbursement") {
    parts.push("You pay first here and claim it back afterwards.");
  } else if (hospital.settlement === "cashless") {
    parts.push("They settle directly with the insurer.");
  }

  if (hospital.requiresPreauth) {
    parts.push(
      hospital.preauthLeadDays
        ? `They want approval from the insurer ${hospital.preauthLeadDays} days ahead.`
        : "They want approval from the insurer in advance.",
    );
  }

  if (policy.roomEntitlement) {
    parts.push(
      `Your policy covers a ${policy.roomEntitlement} room; above that you pay the difference on everything.`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * The same answer, short enough to rank several places against each other.
 *
 * Compare lifts insurance out of the table into its own card precisely because
 * a four-column grid could only ever express it as a compressed one-liner. So
 * this is that one-liner, and it stays a phrase rather than becoming a symbol:
 * "Claim it back" is a different fact from "Covered", and the difference is
 * money you have to find on the day.
 */
export type CoverSummary = {
  /** Lower sorts first. Unknown is last because it is unranked, not bad. */
  rank: number;
  /** The chip. Four words at most. */
  word: string;
  /** Why, in a few words. Omitted when the word is the whole story. */
  reason?: string;
  /** Nobody has checked, so the chip is an outline rather than a statement. */
  unchecked: boolean;
};

export function summariseCover(
  policy: Policy,
  dueDate: PlainDate,
  hospital: HospitalCover | null,
): CoverSummary {
  const verdict = assessCover(policy, dueDate, hospital);

  if (verdict.kind === "unknown") {
    return { rank: 4, word: "not checked", unchecked: true };
  }

  if (verdict.kind === "not_accepted") {
    return {
      rank: 2,
      word: "They don't take it",
      reason: "You would pay the whole bill",
      unchecked: false,
    };
  }

  if (verdict.kind === "not_covered") {
    const starts = coverStartsOn(policy);
    return {
      rank: 3,
      word: "Not covered",
      reason: starts
        ? `The wait runs to ${formatMonthYear(starts)}`
        : undefined,
      unchecked: false,
    };
  }

  const starts = coverStartsOn(policy);
  const waitEnded = starts ? `Wait ended ${formatMonthYear(starts)}` : undefined;

  // Covered, but you are out of pocket until the claim is paid. That is a
  // different thing to plan for, so it gets its own word.
  if (hospital?.settlement === "reimbursement") {
    return {
      rank: 1,
      word: "Claim it back",
      reason: "You pay first here",
      unchecked: false,
    };
  }

  return { rank: 0, word: "Covered", reason: waitEnded, unchecked: false };
}

/**
 * A quote is stale after sixty days, and the app says so in words rather than
 * marking it with a colour.
 */
export function quoteAgeNote(
  quotedOn: PlainDate | null,
  today: PlainDate,
): string | null {
  if (!quotedOn) return null;
  const days = daysBetween(quotedOn, today);
  if (days < 60) return null;
  const months = Math.max(2, Math.round(days / 30));
  return months >= 12
    ? `asked over a year ago`
    : `asked ${months} months ago`;
}
