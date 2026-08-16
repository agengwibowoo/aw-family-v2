/**
 * Reading a form.
 *
 * Every one of these turns an absent, empty or unparseable field into `null`
 * rather than into a default. That distinction is the whole point: a blank
 * field means nobody has said, and the screens render that as "not filled in".
 * A `0` or a `false` standing in for unknown is a bug we can only avoid by
 * never manufacturing one here.
 */

export function text(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export function number(v: FormDataEntryValue | null): number | null {
  const s = text(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * A count someone typed. Floors at `min` and refuses anything fractional,
 * because "how many did you get" has no fractional answer and a stray decimal
 * would otherwise reach a check constraint as a database error.
 */
export function count(
  v: FormDataEntryValue | null,
  { min = 0, fallback = null }: { min?: number; fallback?: number | null } = {},
): number | null {
  const n = number(v);
  if (n === null || !Number.isInteger(n)) return fallback;
  return Math.max(min, n);
}

/** Yes, no, or nobody has said. The third is not a default to treat as "no". */
export function tristate(v: FormDataEntryValue | null): boolean | null {
  const s = text(v);
  if (s === "yes") return true;
  if (s === "no") return false;
  return null;
}

/** An unchecked checkbox sends nothing at all, so absence is false here. */
export function checkbox(v: FormDataEntryValue | null): boolean {
  return v !== null && v !== "" && v !== "off";
}

/**
 * A value that has to be one of a known set — a decision, an archive reason, a
 * delivery type. Anything else is dropped rather than passed through to a check
 * constraint, so a hand-edited form cannot produce a database error.
 */
export function oneOf<const T extends readonly string[]>(
  v: FormDataEntryValue | null,
  allowed: T,
): T[number] | null {
  const s = text(v);
  return s !== null && (allowed as readonly string[]).includes(s)
    ? (s as T[number])
    : null;
}
