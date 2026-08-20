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
   A place just taken off the list
   --------------------------------------------------------------------------- */

const REMOVED = "np_removed_place";

/**
 * Its own cookie rather than a wider `Saved`, because the two have nothing in
 * common but a duration: one is a purchase whose count can be put back, this
 * is a place that left the list.
 *
 * A pointer, never the authority — the row itself is what says whether the
 * place is still removed, and `restoreHospital` reads that, not this.
 */
export type RemovedPlace = { hospitalId: string; name: string };

export async function rememberRemovedPlace(place: RemovedPlace): Promise<void> {
  const jar = await cookies();
  jar.set(REMOVED, JSON.stringify(place), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNDO_WINDOW_MINUTES * 60,
  });
}

export async function readRemovedPlace(): Promise<RemovedPlace | null> {
  const jar = await cookies();
  const raw = jar.get(REMOVED)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RemovedPlace;
    if (!parsed?.hospitalId || !parsed?.name) return null;
    return parsed;
  } catch {
    // She loses the undo affordance, not the row. It is still on the removed
    // places screen, which is the path that does not expire.
    return null;
  }
}

export async function forgetRemovedPlace(): Promise<void> {
  const jar = await cookies();
  jar.delete(REMOVED);
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

/* ---------------------------------------------------------------------------
   A date just taken off the list
   --------------------------------------------------------------------------- */

const DATE_OFF = "np_date_off";

/**
 * Its own cookie again, for the same reason as the one above: a purchase, a
 * place and a date have nothing in common but a duration.
 *
 * A pointer, never the authority — the row's own status is what says whether
 * the date is off, and `putEventBack` reads that, not this.
 */
export type DateOff = { eventId: string; title: string };

export async function rememberDateOff(date: DateOff): Promise<void> {
  const jar = await cookies();
  jar.set(DATE_OFF, JSON.stringify(date), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNDO_WINDOW_MINUTES * 60,
  });
}

export async function readDateOff(): Promise<DateOff | null> {
  const jar = await cookies();
  const raw = jar.get(DATE_OFF)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DateOff;
    if (!parsed?.eventId || !parsed?.title) return null;
    return parsed;
  } catch {
    // She loses the undo affordance, not the date. It is still on the screen
    // of dates taken off, which is the path that does not expire.
    return null;
  }
}

export async function forgetDateOff(): Promise<void> {
  const jar = await cookies();
  jar.delete(DATE_OFF);
}

/* ---------------------------------------------------------------------------
   A paper just ticked off
   --------------------------------------------------------------------------- */

const PAPER_GOT = "np_paper_got";

/**
 * Its own cookie again, for the same reason as the two above: a purchase, a
 * place, a date and a paper have nothing in common but a duration.
 *
 * A pointer, never the authority — `document_status.have_original` is what says
 * whether the paper is had, and the ready row's own control reads that, not
 * this.
 */
export type GotPaper = { documentId: number; name: string };

export async function rememberGotPaper(paper: GotPaper): Promise<void> {
  const jar = await cookies();
  jar.set(PAPER_GOT, JSON.stringify(paper), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNDO_WINDOW_MINUTES * 60,
  });
}

export async function readGotPaper(): Promise<GotPaper | null> {
  const jar = await cookies();
  const raw = jar.get(PAPER_GOT)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GotPaper;
    // A smallint id can legitimately be 0, so this checks the type rather than
    // the truthiness the other two get away with.
    if (typeof parsed?.documentId !== "number" || !parsed?.name) return null;
    return parsed;
  } catch {
    // She loses the undo affordance, not the tick. The paper's own row on the
    // papers screen offers the same way back, and that one never expires.
    return null;
  }
}

export async function forgetGotPaper(): Promise<void> {
  const jar = await cookies();
  jar.delete(PAPER_GOT);
}
