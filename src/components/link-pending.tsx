"use client";

import { useLinkStatus } from "next/link";

/**
 * Says a tapped link is still fetching, by dimming the link it sits in.
 *
 * It renders nothing of its own — the `a:has([data-pending])` rule in
 * globals.css does the dimming — because wrapping a link's children in a span
 * would break the flex layouts these components are built on.
 *
 * Links are prefetched, so this only ever appears when a screen is genuinely
 * slow to arrive. That is the point.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden hidden data-pending={pending || undefined} />;
}
