import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";

import { db } from "../db";
import { appUsers } from "../schema";

export type AppUserRow = typeof appUsers.$inferSelect;

/**
 * Who can get in.
 *
 * The full screen (S15) is deferred — turned-off accounts, "let back in", the
 * seam for a limited role. What is here is the minimum that makes a two-person
 * household work: see who is waiting, let them in, or stop them.
 */

export async function listMembers(): Promise<{
  waiting: AppUserRow[];
  household: AppUserRow[];
  turnedOff: AppUserRow[];
}> {
  const rows = await db
    .select()
    .from(appUsers)
    .orderBy(desc(appUsers.requestedAt), asc(appUsers.email));

  return {
    // The only rows that ever need action, so they go first.
    waiting: rows.filter((r) => r.status === "pending"),
    household: rows.filter((r) => r.status === "approved"),
    turnedOff: rows.filter((r) => r.status === "blocked"),
  };
}

/**
 * Who can let somebody in, by name.
 *
 * The waiting screen has to say who has to act — "an administrator" is not a
 * person you can go and ask.
 */
export async function listAdmins(): Promise<
  { displayName: string | null; email: string }[]
> {
  return db
    .select({ displayName: appUsers.displayName, email: appUsers.email })
    .from(appUsers)
    .where(and(eq(appUsers.isAdmin, true), eq(appUsers.status, "approved")))
    .orderBy(asc(appUsers.email));
}

export async function approveMember(id: string, by: string): Promise<void> {
  await db
    .update(appUsers)
    .set({ status: "approved", decidedAt: new Date(), decidedBy: by })
    .where(eq(appUsers.id, id));
}

export async function blockMember(id: string, by: string): Promise<void> {
  // An admin cannot lock the household out by turning off the last way in.
  const remaining = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(
      and(eq(appUsers.status, "approved"), eq(appUsers.isAdmin, true), ne(appUsers.id, id)),
    );

  if (remaining.length === 0) {
    throw new Error("That is the last admin. Someone has to be able to let people in.");
  }

  await db
    .update(appUsers)
    .set({ status: "blocked", decidedAt: new Date(), decidedBy: by })
    .where(eq(appUsers.id, id));
}

/**
 * Letting somebody back in.
 *
 * Kept separate from approving a new request even though the row ends up in
 * the same state: they are different decisions, and only one of them is
 * reversing your own earlier one. It refuses to touch anybody who is not
 * actually turned off, so a stale screen cannot silently re-approve someone
 * who is merely waiting.
 */
export async function unblockMember(id: string, by: string): Promise<void> {
  await db
    .update(appUsers)
    .set({ status: "approved", decidedAt: new Date(), decidedBy: by })
    .where(and(eq(appUsers.id, id), eq(appUsers.status, "blocked")));
}

/**
 * Bumps the request to the top of the admin's list.
 *
 * There is no notification channel — reminders belong to the chat assistant and
 * are out of scope here — so this changes what the admin sees next time they
 * look. It does not send anything, and the copy must not imply that it does.
 */
export async function askAgain(id: string): Promise<void> {
  await db
    .update(appUsers)
    .set({ requestedAt: new Date() })
    .where(and(eq(appUsers.id, id), eq(appUsers.status, "pending")));
}
