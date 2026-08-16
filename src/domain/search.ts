/**
 * Finding a thing by name, in either language.
 *
 * The data is bilingual and the interface is not. She types `bottle`; the thing
 * is called `Botol susu`, because that is what it says on the box and nobody
 * translates what they typed. Substring matching alone finds nothing, and a
 * search that fails on the commonest word in the catalog is a search nobody
 * uses twice.
 *
 * So English is substituted for Indonesian before matching, not after. The map
 * is deliberately small and hand-written: these are the words this household
 * actually uses, and a general translation layer would be both bigger and
 * worse.
 */

/** English → what it is actually called here. */
const SYNONYMS: Record<string, string> = {
  bottle: "botol",
  bottles: "botol",
  nappy: "popok",
  nappies: "popok",
  diaper: "popok",
  diapers: "popok",
  wipe: "waslap",
  wipes: "waslap",
  washcloth: "waslap",
  washcloths: "waslap",
  pad: "pembalut",
  pads: "pembalut",
  swaddle: "bedong",
  swaddles: "bedong",
  brush: "sikat",
  brushes: "sikat",
  corset: "korset",
  corsets: "korset",
  clothes: "baju",
  clothing: "baju",
  shirt: "baju",
  shirts: "baju",
};

/**
 * Every form worth looking for.
 *
 * Returns the query itself as well as any substitution, because the catalog is
 * mixed: `bottle` has to find both `Botol susu` and `Bottle brush`. Matching on
 * the substitution alone would trade one blind spot for another.
 */
export function searchTerms(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === "") return [];

  const terms = new Set<string>([trimmed]);

  for (const word of trimmed.split(/\s+/)) {
    const swapped = SYNONYMS[word];
    if (swapped) {
      terms.add(swapped);
      // "bottle brush" should also try "botol sikat".
      terms.add(
        trimmed
          .split(/\s+/)
          .map((w) => SYNONYMS[w] ?? w)
          .join(" "),
      );
    }
  }

  return [...terms];
}

/** Case-insensitive substring, after substitution. */
export function matchesName(name: string, query: string): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return false;
  const haystack = name.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

/**
 * How many matched, said as a sentence.
 *
 * Numbers carry their frame everywhere in this app, and a bare count above a
 * list is the one place it is tempting to drop it.
 */
export function matchCountLine(count: number, query: string): string {
  const thing = count === 1 ? "thing matches" : "things match";
  return `${count} ${thing} “${query.trim()}”`;
}
