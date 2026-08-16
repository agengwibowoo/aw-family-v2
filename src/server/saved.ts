import "server-only";

import { cookies } from "next/headers";

import { UNDO_WINDOW_MINUTES } from "./services/purchases";

/**
 * What was just saved, and for how long it can be taken back.
 *
 * The confirmation card is explicitly not a toast: it survives navigation and
 * stays for the full fifteen minutes, because it is the only safety mechanism
 * in the app — there are no "are you sure" dialogs anywhere, which is what
 * lets recording a purchase take three seconds.
 *
 * So it cannot live in component state. It lives in a short cookie, which any
 * server component can read, which is what lets the same card appear on Today
 * or on the thing depending on how she arrived.
 *
 * The cookie is a pointer, never the authority. `undoPurchase` re-checks the
 * window against the row's own timestamp, so editing this cookie buys nothing.
 */

const COOKIE = "np_undo";

export type Saved = {
  purchaseId: string;
  itemId: string;
  name: string;
  qty: number;
  have: number;
  need: number;
};

export async function rememberSaved(saved: Saved): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(saved), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNDO_WINDOW_MINUTES * 60,
  });
}

export async function readSaved(): Promise<Saved | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Saved;
    if (!parsed?.purchaseId || !parsed?.itemId) return null;
    return parsed;
  } catch {
    // A malformed cookie is not worth an error page on the screen she landed
    // on. She loses the undo affordance, not the save.
    return null;
  }
}

export async function forgetSaved(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/* ---------------------------------------------------------------------------
   "Later", on Today
   --------------------------------------------------------------------------- */

const LATER = "np_later";
const LATER_DAYS = 7;

/**
 * Cards she has pushed away, and when.
 *
 * Seven days, then it comes back — because "later" means later, not never, and
 * a thing she still needs should ask again before the band it belongs to has
 * gone past.
 */
export async function readDismissed(): Promise<Set<string>> {
  const jar = await cookies();
  const raw = jar.get(LATER)?.value;
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw) as { id: string; at: number }[];
    const cutoff = Date.now() - LATER_DAYS * 86_400_000;
    return new Set(
      parsed.filter((d) => d.at > cutoff).map((d) => d.id),
    );
  } catch {
    return new Set();
  }
}

export async function dismissForNow(id: string): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(LATER)?.value;

  let entries: { id: string; at: number }[] = [];
  try {
    entries = raw ? (JSON.parse(raw) as { id: string; at: number }[]) : [];
  } catch {
    entries = [];
  }

  const cutoff = Date.now() - LATER_DAYS * 86_400_000;
  const next = [
    ...entries.filter((d) => d.at > cutoff && d.id !== id),
    { id, at: Date.now() },
  ];

  jar.set(LATER, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: LATER_DAYS * 86_400,
  });
}
