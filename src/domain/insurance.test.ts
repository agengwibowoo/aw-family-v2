import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  assessCover,
  coverStartsOn,
  quoteAgeNote,
  summariseCover,
  type HospitalCover,
  type Policy,
} from "./insurance";

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

describe("the short form used on compare", () => {
  const at = (over: Partial<HospitalCover> = {}): HospitalCover => ({
    insurerName: "Insurer",
    accepted: true,
    settlement: null,
    requiresPreauth: null,
    preauthLeadDays: null,
    ...over,
  });

  it("ranks a covered place above one you have to claim back from", () => {
    const covered = summariseCover(policy(), DUE, at({ settlement: "cashless" }));
    const claim = summariseCover(policy(), DUE, at({ settlement: "reimbursement" }));

    assert.equal(covered.word, "Covered");
    assert.equal(claim.word, "Claim it back");
    assert.ok(covered.rank < claim.rank);
  });

  it("says who pays first, because that is money you find on the day", () => {
    const claim = summariseCover(policy(), DUE, at({ settlement: "reimbursement" }));
    assert.equal(claim.reason, "You pay first here");
  });

  it("puts a place that refuses your insurer below both", () => {
    const refused = summariseCover(policy(), DUE, at({ accepted: false }));
    assert.equal(refused.word, "They don't take it");
    assert.ok(refused.rank > summariseCover(policy(), DUE, at()).rank);
  });

  it("marks unchecked as unchecked, and sorts it last rather than badly", () => {
    // Nobody having looked is not the same as the answer being no. It sorts
    // last because it is unranked, not because it is bad news.
    const unknown = summariseCover(
      policy({ maternityWaitingPeriodMonths: null }),
      DUE,
      null,
    );
    assert.equal(unknown.word, "not checked");
    assert.equal(unknown.unchecked, true);

    const worst = summariseCover(policy({ policyStartedOn: "2026-03-01" }), DUE, null);
    assert.ok(unknown.rank > worst.rank);
  });

  it("never renders a status as a bare absence", () => {
    for (const s of [
      summariseCover(policy(), DUE, null),
      summariseCover(policy({ policyStartedOn: "2026-03-01" }), DUE, null),
      summariseCover(policy({ maternityWaitingPeriodMonths: null }), DUE, null),
      summariseCover(policy(), DUE, at({ accepted: false })),
    ]) {
      assert.ok(s.word.length > 0, "every place gets a word");
    }
  });
});
