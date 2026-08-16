/**
 * Links people paste in.
 *
 * A link arrives from a chat thread, which means it arrives covered in tracking
 * parameters. Those make the same product look like two different links, which
 * is how a thing ends up with four identical "reviews" attached to it. So they
 * are stripped before anything else happens, and the cleaned URL is what
 * dedupe compares.
 */

/** Tracking, and nothing that identifies the thing being linked to. */
const TRACKING_PARAMS = [
  /^utm_/,
  /^gclid$/,
  /^fbclid$/,
  /^srsltid$/,
  /^igshid$/,
  /^si$/,
  // Shopee's tail: affiliate and session, never the product.
  /^sp_atk$/,
  /^xptdk$/,
  /^is_from_login$/,
  // Tokopedia and TikTok equivalents.
  /^extParam$/,
  /^_r$/,
  /^_d$/,
  /^checksum$/,
];

export function cleanUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.trim();
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) {
      url.searchParams.delete(key);
    }
  }

  // A trailing "?" left behind by stripping everything is noise.
  url.hash = "";
  return url.toString().replace(/\?$/, "");
}

/** Which app should open this, and whether it can play inline. */
export function platformOf(raw: string): string | null {
  let host: string;
  try {
    host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }

  if (host.includes("youtube") || host === "youtu.be") return "YouTube";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("shopee")) return "Shopee";
  if (host.includes("tokopedia")) return "Tokopedia";
  if (host.includes("lazada")) return "Lazada";
  if (host.includes("blibli")) return "Blibli";
  return host;
}

/**
 * The one exception to "no inline players".
 *
 * YouTube is allowed to play in place; everything else opens its own app,
 * because on a phone what she actually wants is TikTok, not a cramped iframe.
 * This is not the beginning of a generic embed system.
 */
export function isYouTube(raw: string): boolean {
  return platformOf(raw) === "YouTube";
}

/** A last-resort title, so a failed preview still saves something readable. */
export function titleFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const last = url.pathname.split("/").filter(Boolean).pop();
    if (!last) return url.hostname.replace(/^www\./, "");
    return decodeURIComponent(last).replace(/[-_]+/g, " ").slice(0, 80);
  } catch {
    return raw;
  }
}
