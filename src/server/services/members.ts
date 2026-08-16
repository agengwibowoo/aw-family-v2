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
