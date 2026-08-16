import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { assessCover, coverStartsOn, quoteAgeNote, type Policy } from "./insurance";

const DUE = "2026-10-14";

const policy = (over: Partial<Policy> = {}): Policy => ({
  insurerName: "Insurer",
  policyStartedOn: "2025-06-03",
  maternityWaitingPeriodMonths: 12,
  roomEntitlement: null,
  ...over,
});

describe("cover", () => {
  it("starts after the waiting period, not at the policy date", () => {
    assert.equal(coverStartsOn(policy()), "2026-06-03");
  });

  it("covers a birth after the wait ends", () => {
    const v = assessCover(policy(), DUE);
    assert.equal(v.kind, "covered");
    assert.equal(v.headline, "The birth should be covered.");
    assert.match(v.reason!, /12-month wait/);
    assert.match(v.reason!, /Jun 2026/);
  });

  it("does not cover a policy started after conception", () => {
    // The one that ruins people: a 12-month wait started in March 2026 does
    // not end until March 2027, five months after the birth.
    const v = assessCover(policy({ policyStartedOn: "2026-03-01" }), DUE);
    assert.equal(v.kind, "not_covered");
    assert.equal(v.headline, "The birth would not be covered.");
    assert.match(v.reason!, /Mar 2027/);
    assert.equal(v.consequence, "Plan to pay for the delivery yourselves.");
  });

  it("never leaves the reader to subtract two dates", () => {
    const v = assessCover(policy({ policyStartedOn: "2026-03-01" }), DUE);
    // No bare date-plus-duration anywhere in the output.
    const all = [v.headline, v.reason, v.consequence].join(" ");
    assert.doesNotMatch(all, /\d{4}-\d{2}-\d{2}/);
  });

  it("states unknown as a sentence, never as a blank", () => {
    const missingStart = assessCover(policy({ policyStartedOn: null }), DUE);
    assert.equal(missingStart.kind, "unknown");
    assert.equal(
      missingStart.headline,
      "Nobody has checked the insurance for this one.",
    );

    const missingWait = assessCover(
      policy({ maternityWaitingPeriodMonths: null }),
      DUE,
    );
    assert.equal(missingWait.kind, "unknown");
    assert.match(missingWait.reason!, /how long the maternity wait is/);
  });

  it("leads with the hospital refusing the insurer, whatever the policy says", () => {
    const v = assessCover(policy(), DUE, {
      insurerName: "Insurer",
      accepted: false,
      settlement: null,
      requiresPreauth: null,
      preauthLeadDays: null,
    });
    assert.equal(v.kind, "not_accepted");
    assert.equal(v.consequence, "You would be paying the whole bill yourselves.");
  });

  it("warns about paying first, and about the room entitlement", () => {
    const v = assessCover(policy({ roomEntitlement: "Kelas 1" }), DUE, {
      insurerName: "Insurer",
      accepted: true,
      settlement: "reimbursement",
      requiresPreauth: true,
      preauthLeadDays: 5,
    });
    assert.equal(v.kind, "covered");
    assert.match(v.consequence!, /pay first/);
    assert.match(v.consequence!, /5 days ahead/);
    assert.match(v.consequence!, /Kelas 1/);
  });
});

describe("quote age", () => {
  it("says nothing while a quote is fresh", () => {
    assert.equal(quoteAgeNote("2026-08-01", "2026-08-15"), null);
    assert.equal(quoteAgeNote("2026-06-20", "2026-08-15"), null);
    assert.equal(quoteAgeNote(null, "2026-08-15"), null);
  });

  it("says so in words once it is stale, with no colour to notice", () => {
    assert.equal(quoteAgeNote("2026-04-01", "2026-08-15"), "asked 5 months ago");
    assert.equal(quoteAgeNote("2025-01-01", "2026-08-15"), "asked over a year ago");
  });
});
