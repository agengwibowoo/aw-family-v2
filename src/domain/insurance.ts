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
