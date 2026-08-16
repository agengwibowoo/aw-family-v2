import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { nothingToDoLine, rankTodayCards, type Candidate } from "./today";

const TODAY = "2026-08-16";

/** Band 1 is due in a fortnight; band 2 is months off. */
const DEADLINES = new Map([
  [1, "2026-08-30"],
  [2, "2026-12-01"],
  [3, null],
]);

const thing = (over: Partial<Candidate> = {}): Candidate => ({
  id: "id",
  name: "Popok newborn",
  have: 4,
  need: 12,
  bandId: 2,
  bandName: "Before the birth",
  bandSortOrder: 1,
  categorySortOrder: 1,
  prioritySortOrder: 1,
  status: "still_need",
  ...over,
});

const rank = (candidates: Candidate[], over = {}) =>
  rankTodayCards(candidates, {
    currentBandId: 2,
    bandDeadlines: DEADLINES,
    today: TODAY,
    ...over,
  });

describe("what needs doing today", () => {
  it("shows at most three things to do", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      thing({ id: `t${i}`, name: `Thing ${i}` }),
    );
    assert.equal(rank(many).length, 3);
  });

  it("puts a deadline inside a month above the band you are in", () => {
    // The whole reason the first tier is not simply "this band".
    const urgent = thing({ id: "urgent", name: "Korset", bandId: 1, bandSortOrder: 9 });
    const current = thing({ id: "current", name: "Bedong" });

    const cards = rank([current, urgent]);
    assert.equal(cards[0].id, "urgent");
    assert.equal(cards[0].tier, 1);
    assert.equal(cards[1].tier, 2);
  });

  it("puts essential above recommended within the same band", () => {
    const nice = thing({ id: "nice", name: "Aaa", prioritySortOrder: 2 });
    const must = thing({ id: "must", name: "Zzz", prioritySortOrder: 1 });

    const cards = rank([nice, must]);
    assert.equal(cards[0].id, "must", "essential first, whatever the name");
  });

  it("never shows an optional thing", () => {
    const optional = thing({ id: "opt", prioritySortOrder: 3 });
    assert.deepEqual(rank([optional]), []);
  });

  it("never shows a thing that is not still needed", () => {
    assert.deepEqual(rank([thing({ status: "got_it" })]), []);
    assert.deepEqual(rank([thing({ status: "more_than_enough" })]), []);
  });

  it("breaks ties the same way every time, so the order is answerable", () => {
    // Same tier and same band: category order, then name. Given identical
    // inputs the answer to "why is this here?" must not change between loads.
    const a = thing({ id: "a", name: "Bbb", categorySortOrder: 2 });
    const b = thing({ id: "b", name: "Aaa", categorySortOrder: 2 });
    const c = thing({ id: "c", name: "Zzz", categorySortOrder: 1 });

    const once = rank([a, b, c]).map((x) => x.id);
    const twice = rank([c, b, a]).map((x) => x.id);

    assert.deepEqual(once, ["c", "b", "a"]);
    assert.deepEqual(once, twice, "input order changes nothing");
  });

  it("promotes the next candidate when one is pushed away", () => {
    const first = thing({ id: "first", name: "Aaa" });
    const second = thing({ id: "second", name: "Bbb" });
    const third = thing({ id: "third", name: "Ccc" });
    const fourth = thing({ id: "fourth", name: "Ddd" });

    const all = [first, second, third, fourth];
    assert.deepEqual(rank(all).map((c) => c.id), ["first", "second", "third"]);

    const after = rank(all, { dismissed: new Set(["first"]) });
    assert.deepEqual(after.map((c) => c.id), ["second", "third", "fourth"]);
  });

  it("says how many more, and why it is here", () => {
    const [card] = rank([thing({ have: 4, need: 12 })]);
    assert.equal(card.title, "Get 8 more popok newborn");
    assert.equal(card.reason, "Before the birth · wanted by 1 Dec");
  });
});

describe("the sentence when nothing needs doing", () => {
  it("only says a band is done when it actually is", () => {
    // "The hospital bag is done" over a 38% bar is the one thing this screen
    // cannot say.
    const unfinished = nothingToDoLine({
      bandName: "Before the birth",
      got: 4,
      things: 11,
      nextDeadline: "2026-09-15",
      nextDateOn: "2026-08-21",
    });

    assert.match(unfinished, /7 things still to get/);
    assert.doesNotMatch(unfinished, /done/);
  });

  it("says it is done when it is", () => {
    const finished = nothingToDoLine({
      bandName: "Before the birth",
      got: 11,
      things: 11,
      nextDeadline: "2026-09-15",
      nextDateOn: null,
    });

    assert.match(finished, /Before the birth is done\./);
    assert.match(finished, /Next thing due 15 Sep\./);
  });

  it("counts one thing as a thing", () => {
    const one = nothingToDoLine({
      bandName: "Before the birth",
      got: 10,
      things: 11,
      nextDeadline: null,
      nextDateOn: null,
    });
    assert.match(one, /1 thing still to get/);
  });

  it("does not claim a band is done when there is nothing in it", () => {
    const empty = nothingToDoLine({
      bandName: "Before the birth",
      got: 0,
      things: 0,
      nextDeadline: null,
      nextDateOn: "2026-08-21",
    });

    assert.match(empty, /Nothing on the list yet for Before the birth\./);
    assert.doesNotMatch(empty, /done/);
  });
});
