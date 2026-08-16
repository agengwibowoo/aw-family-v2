import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatIdr, hideIdr, renderIdr } from "./money";
import { countOf, itemStatus, ITEM_STATUS_WORDS } from "./status";

describe("money", () => {
  it("writes rupiah with German-style separators and no minor unit", () => {
    assert.equal(formatIdr(180000), "Rp180.000");
    assert.equal(formatIdr(32000000), "Rp32.000.000");
    assert.equal(formatIdr("180000"), "Rp180.000");
    assert.equal(formatIdr(1500.4), "Rp1.500");
  });

  it("says nothing rather than zero when there is no amount", () => {
    // A 0 standing in for unknown is a bug: it reads as free.
    assert.equal(formatIdr(null), "");
    assert.equal(formatIdr(undefined), "");
    assert.equal(formatIdr(""), "");
  });

  it("hides an amount at exactly the width it shows it", () => {
    // This is the whole reason money is mono and tabular: revealing it must
    // never reflow a layout.
    for (const amount of [0, 1500, 180000, 32000000, 999999999]) {
      assert.equal(
        hideIdr(amount).length,
        formatIdr(amount).length,
        `width differs at ${amount}`,
      );
    }
  });

  it("hides by default", () => {
    assert.equal(renderIdr(180000, true), "Rp180.000");
    assert.equal(renderIdr(180000, false), "Rp•••••••");
    assert.equal(renderIdr(null, false), "");
  });
});

describe("status", () => {
  it("does not report a partial buy as done", () => {
    // The legacy generated column read `when owned_qty = 0 then 'Not bought'
    // / when owned_qty > target_qty then 'Over' / else 'Bought'`, so 2 of 5
    // fell through to 'Bought'.
    assert.equal(itemStatus(2, 5), "still_need");
    assert.equal(itemStatus(0, 5), "still_need");
    assert.equal(itemStatus(4, 5), "still_need");
  });

  it("is got_it at exactly enough, and above only when above", () => {
    assert.equal(itemStatus(5, 5), "got_it");
    assert.equal(itemStatus(6, 5), "more_than_enough");
    assert.equal(itemStatus(0, 0), "got_it");
  });

  it("reads as calm words, never as an error", () => {
    assert.equal(ITEM_STATUS_WORDS.more_than_enough, "More than enough");
    assert.equal(ITEM_STATUS_WORDS.still_need, "Still need this");
    assert.equal(ITEM_STATUS_WORDS.got_it, "Got it");
  });

  it("gives a count its frame", () => {
    assert.equal(countOf(4, 12), "4 of 12");
    assert.equal(countOf(10, 6), "10 of 6");
    assert.equal(countOf(0, 2), "0 of 2");
  });
});
