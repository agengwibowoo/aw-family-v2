import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../db";
import { itemMaterials, links, materials } from "../schema";
import { cleanUrl, platformOf, titleFromUrl } from "@/domain/links";

/**
 * Reviews and videos that landed here.
 *
 * The app is not a place she browses reviews; it is a place reviews land. So a
 * link is saved as a card that opens the platform's own app, never as an
 * embed — on a phone what she actually wants is TikTok, not a cramped iframe.
 *
 * A failed preview still saves. Losing a link because oEmbed was slow would be
 * a worse outcome than a card with a plain title on it, every time.
 */

/** oEmbed endpoints worth asking. Everything else degrades to a plain card. */
const OEMBED: { match: RegExp; endpoint: (url: string) => string }[] = [
  {
    match: /youtube\.com|youtu\.be/,
    endpoint: (u) =>
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  },
  {
    match: /tiktok\.com/,
    endpoint: (u) =>
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  },
];

type Preview = {
  title: string | null;
  thumbnail: string | null;
  creator: string | null;
};

/**
 * Ask the platform what this is, briefly.
 *
 * Two seconds, and never more: this runs inside the save, and a slow oEmbed
 * endpoint must not become a slow save.
 */
async function fetchPreview(url: string): Promise<Preview> {
  const provider = OEMBED.find((p) => p.match.test(url));
  if (!provider) return { title: null, thumbnail: null, creator: null };

  try {
    const response = await fetch(provider.endpoint(url), {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return { title: null, thumbnail: null, creator: null };

    const data = (await response.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };

    return {
      title: data.title ?? null,
      thumbnail: data.thumbnail_url ?? null,
      creator: data.author_name ?? null,
    };
  } catch {
    // Offline, rate-limited, or the platform changed its mind. The link is
    // still worth keeping.
    return { title: null, thumbnail: null, creator: null };
  }
}

export type LinkTarget =
  | { itemId: string }
  | { candidateId: string }
  | { purchaseId: string };

/**
 * Save a link against exactly one thing.
 *
 * The same URL twice on the same target is one link, held by a partial unique
 * index — so this returns quietly rather than erroring when she pastes it
 * again, which is what a person expects from pasting the same thing twice.
 */
export async function addLink(
  target: LinkTarget,
  rawUrl: string,
  by: string,
  note?: string | null,
): Promise<void> {
  const url = cleanUrl(rawUrl);
  if (!url) return;

  const preview = await fetchPreview(url);

  await db
    .insert(links)
    .values({
      itemId: "itemId" in target ? target.itemId : null,
      candidateId: "candidateId" in target ? target.candidateId : null,
      purchaseId: "purchaseId" in target ? target.purchaseId : null,
      url,
      platform: platformOf(url),
      // A failed preview still saves, with something readable as the title.
      title: preview.title ?? titleFromUrl(url),
      thumbnailPath: preview.thumbnail,
      creator: preview.creator,
      note: note ?? null,
      addedBy: by,
    })
    .onConflictDoNothing();
}

export async function removeLink(id: string): Promise<void> {
  await db.delete(links).where(eq(links.id, id));
}

/* ---------------------------------------------------------------------------
   What it's made of
   --------------------------------------------------------------------------- */

/**
 * Materials, asked for in four categories and left blank everywhere else.
 *
 * Nobody will fill this in for a hundred and twenty things, so it is prompted
 * only where it changes a decision — clothing, feeding, toiletries and bath —
 * and it never blocks a save.
 *
 * `commonly_irritant` is shown as a plain extra chip: no icon, no colour, no
 * alert. This app records; a paediatrician concludes.
 */
export async function setThingMaterials(
  itemId: string,
  names: readonly string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(itemMaterials).where(eq(itemMaterials.itemId, itemId));

    const wanted = names.map((n) => n.trim()).filter(Boolean);
    if (wanted.length === 0) return;

    for (const name of wanted) {
      // Typing a new material adds it to the lookup, so the vocabulary grows
      // with the household rather than being fixed at seed time.
      const [existing] = await tx
        .select({ id: materials.id })
        .from(materials)
        .where(eq(materials.name, name));

      const materialId =
        existing?.id ??
        (
          await tx
            .insert(materials)
            .values({ name })
            .onConflictDoNothing()
            .returning({ id: materials.id })
        )[0]?.id ??
        (
          await tx
            .select({ id: materials.id })
            .from(materials)
            .where(eq(materials.name, name))
        )[0]?.id;

      if (materialId === undefined) continue;

      await tx
        .insert(itemMaterials)
        .values({ itemId, materialId })
        .onConflictDoNothing();
    }
  });
}

/** The vocabulary, for the chips to offer. */
export async function listKnownMaterials() {
  return db.select().from(materials).orderBy(materials.name);
}
