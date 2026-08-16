import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { matchCountLine, matchesName, searchTerms } from "./search";

describe("finding a thing by name", () => {
  it("finds an Indonesian name from the English word", () => {
    // The whole reason this module exists. She types the English; the box says
    // the Indonesian.
    assert.ok(matchesName("Botol susu", "bottle"));
    assert.ok(matchesName("Popok newborn", "nappy"));
    assert.ok(matchesName("Popok newborn", "diapers"));
    assert.ok(matchesName("Bedong instan", "swaddle"));
    assert.ok(matchesName("Korset", "corset"));
    assert.ok(matchesName("Waslap", "washcloth"));
    assert.ok(matchesName("Pembalut bersalin", "pads"));
    assert.ok(matchesName("Sikat botol", "brush"));
    assert.ok(matchesName("Baju bayi lengan panjang", "clothes"));
  });

  it("still finds the English name it was given", () => {
    // The catalog is mixed. Substituting instead of adding would trade one
    // blind spot for another.
    assert.ok(matchesName("Bottle brush", "bottle"));
    assert.ok(matchesName("Nappy cream", "nappy"));
  });

  it("ignores case and surrounding space", () => {
    assert.ok(matchesName("Botol susu", "  BOTTLE  "));
    assert.ok(matchesName("BOTOL SUSU", "botol"));
  });

  it("matches on part of a word, because she types part of a word", () => {
    assert.ok(matchesName("Botol susu", "bot"));
    assert.ok(matchesName("Pembalut bersalin", "salin"));
  });

  it("translates every word of a longer query", () => {
    assert.ok(searchTerms("bottle brush").includes("botol sikat"));
  });

  it("matches nothing on an empty query", () => {
    // An empty query shows the jump-to list, not every thing in the catalog.
    assert.deepEqual(searchTerms(""), []);
    assert.deepEqual(searchTerms("   "), []);
    assert.equal(matchesName("Botol susu", ""), false);
  });

  it("does not match an unrelated thing", () => {
    assert.equal(matchesName("Korset", "bottle"), false);
    assert.equal(matchesName("Botol susu", "nappy"), false);
  });

  it("gives the count its frame", () => {
    assert.equal(matchCountLine(1, "botol"), "1 thing matches “botol”");
    assert.equal(matchCountLine(4, "botol"), "4 things match “botol”");
    assert.equal(matchCountLine(0, "xyz"), "0 things match “xyz”");
  });
});
