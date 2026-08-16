/**
 * Money is Indonesian Rupiah, which has no minor unit, and is written with
 * German-style thousands separators: Rp32.000.000.
 *
 * Hidden and shown must occupy the same width, so revealing money never
 * reflows a layout. That is why every amount renders in tabular mono and why
 * the hidden form is one bullet per digit rather than a fixed-length mask.
 */

const HIDDEN_GLYPH = "•";

export function formatIdr(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "";
  return `Rp${Math.round(n).toLocaleString("de-DE")}`;
}

/**
 * The hidden form of a specific amount. Same character count as the shown
 * form, so the two are interchangeable without measuring.
 */
export function hideIdr(amount: number | string | null | undefined): string {
  const shown = formatIdr(amount);
  if (!shown) return "";
  return `Rp${HIDDEN_GLYPH.repeat(shown.length - 2)}`;
}

export function renderIdr(
  amount: number | string | null | undefined,
  shown: boolean,
): string {
  return shown ? formatIdr(amount) : hideIdr(amount);
}
