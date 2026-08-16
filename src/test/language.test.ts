import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

/**
 * The banned words, enforced.
 *
 * ADR-0006 makes the design handoff authoritative for every user-visible
 * string, and its vocabulary list is meant to be a rule rather than a style
 * guide. Copy gets improvised under deadline; this is what stops it.
 *
 * It reads the text a person actually sees — JSX text nodes and the string
 * literals passed to props that render — and ignores identifiers, imports,
 * types and comments, so `type CandidateDecision` and `categories.name` are
 * untouched while a button reading "Mark complete" is not.
 */

const UI_DIRS = ["src/app", "src/components"];

/** From CONTEXT.md and the handoff's vocabulary table. */
const BANNED: { word: RegExp; instead: string }[] = [
  { word: /\bitems?\b/i, instead: "the thing's name, or “thing”" },
  { word: /\bentit(y|ies)\b/i, instead: "name what it actually is" },
  { word: /\brecords?\b/i, instead: "what the row is — a purchase, a date" },
  { word: /\bentr(y|ies)\b/i, instead: "the thing itself" },
  { word: /\bcategor(y|ies)\b/i, instead: "“what sort of thing”" },
  { word: /\bfilters?\b/i, instead: "“Narrow it”" },
  { word: /\bquer(y|ies)\b/i, instead: "“Find a thing”" },
  { word: /\battributes?\b/i, instead: "the fact itself" },
  { word: /\bphases?\b/i, instead: "“what age it's for”, or the band name" },
  { word: /\bmark complete\b/i, instead: "“It's done”" },
  { word: /\bcomplete\b/i, instead: "“done”" },
  { word: /\bquantit(y|ies)\b/i, instead: "“how many”" },
  { word: /\bstatus\b/i, instead: "the status word itself" },
  { word: /\bdeficits?\b/i, instead: "“still need this”" },
  { word: /\bshortfalls?\b/i, instead: "“still need this”" },
  { word: /\bsurplus\b/i, instead: "“more than enough”" },
  { word: /\bovers?stocked\b/i, instead: "“more than enough”" },
];

/**
 * A blank standing in for data.
 *
 * The rule is that missing data says "not filled in", written out — never a
 * dash, never N/A, never a 0. It is about a value that means nothing is known,
 * not about punctuation: an em dash inside a sentence is ordinary prose, and
 * the app's own voice uses plenty of them.
 */
const BLANK_STANDINS = /^(—|-|–|N\/A|n\/a|--|\.\.\.|\?)$/;

/**
 * Text that is not chrome. Names someone typed stay in the language they were
 * typed in, and the placeholders that demonstrate that are data too.
 */
const ALLOWED = [
  // Colour and shape are the design's own vocabulary, not the user's.
  /^[\d\s.,%-]*$/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Everything a person reads on the screen.
 *
 * JSX text between tags, plus the string literals given to the props that
 * render as words. Deliberately not every string in the file: `href="/list"`
 * and `className="..."` are not English anybody reads.
 */
function userVisibleStrings(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // `${query}` is an identifier, not a word she reads. What it renders is
    // her own typing, and that is data.
    .replace(/\$\{[^}]*\}/g, "…");

  const found: string[] = [];

  // JSX text nodes: >  some words  <
  for (const m of withoutComments.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].trim();
    if (text) found.push(text);
  }

  // Props that become words on screen.
  const WORD_PROPS =
    /\b(label|headline|sub|title|reason|hint|placeholder|actionLabel|againLabel|closeLabel|summary|blank|aria-label|alt|note)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\})/g;
  for (const m of withoutComments.matchAll(WORD_PROPS)) {
    const text = (m[2] ?? m[3] ?? m[4] ?? m[5] ?? "").trim();
    if (text) found.push(text);
  }

  return found.filter((t) => !ALLOWED.some((re) => re.test(t)));
}

describe("user-visible language", () => {
  const files = UI_DIRS.flatMap((d) => walk(d));

  it("has screens to check", () => {
    assert.ok(files.length > 10, "expected to find the app's .tsx files");
  });

  for (const file of files) {
    // The gallery labels components by their design-system names, which are
    // the handoff's own words for them and are never on a real screen.
    if (file.includes("gallery")) continue;

    it(`${file} uses none of the banned words`, () => {
      const source = fs.readFileSync(file, "utf8");
      const offences: string[] = [];

      for (const text of userVisibleStrings(source)) {
        for (const { word, instead } of BANNED) {
          if (word.test(text)) {
            offences.push(`“${text}” — say ${instead} instead`);
          }
        }
        if (BLANK_STANDINS.test(text)) {
          offences.push(`“${text}” — a blank says “not filled in”, written out`);
        }
      }

      assert.deepEqual(offences, [], `\n  ${offences.join("\n  ")}\n`);
    });
  }
});
