import "server-only";

import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "./db";
import { appUsers } from "./schema";
import { supabaseServer } from "./supabase";

/**
 * Signing in is not access.
 *
 * A Google account gets you a session; a row in `app_users` with
 * `status = 'approved'` gets you the app. The first person to sign in bootstraps
 * themselves as the admin, because otherwise nobody could ever approve anybody.
 */

export type AppUser = typeof appUsers.$inferSelect;

export type Caller =
  | { kind: "signed_out" }
  | { kind: "pending"; user: AppUser }
  | { kind: "blocked"; user: AppUser }
  | { kind: "approved"; user: AppUser };

/** Deduplicated per request — several components ask who is calling. */
export const getCaller = cache(async (): Promise<Caller> => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { kind: "signed_out" };

  const row = await upsertAppUser(
    user.id,
    user.email,
    (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
  );

  if (row.status === "approved") return { kind: "approved", user: row };
  if (row.status === "blocked") return { kind: "blocked", user: row };
  return { kind: "pending", user: row };
});

async function upsertAppUser(
  id: string,
  email: string,
  displayName: string | null,
): Promise<AppUser> {
  const existing = await db.query.appUsers.findFirst({
    where: eq(appUsers.id, id),
  });

  if (existing) {
    // Keep the display name current without touching the decision.
    if (displayName && displayName !== existing.displayName) {
      const [updated] = await db
        .update(appUsers)
        .set({ displayName })
        .where(eq(appUsers.id, id))
        .returning();
      return updated;
    }
    return existing;
  }

  // First person through the door runs the household.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appUsers);
  const bootstrap = count === 0;

  const [created] = await db
    .insert(appUsers)
    .values({
      id,
      email,
      displayName,
      status: bootstrap ? "approved" : "pending",
      isAdmin: bootstrap,
      decidedAt: bootstrap ? new Date() : null,
    })
    .onConflictDoNothing()
    .returning();

  // Lost a race with a concurrent first request; read what won.
  return (
    created ??
    (await db.query.appUsers.findFirst({ where: eq(appUsers.id, id) }))!
  );
}

/**
 * Use at the top of any gated page. Sends anyone who is not approved to the
 * getting-in screen, carrying where they were headed so they land there rather
 * than on Today — links arrive from a chat thread with no history behind them.
 */
export async function requireApproved(returnTo?: string): Promise<AppUser> {
  const caller = await getCaller();
  if (caller.kind === "approved") return caller.user;

  const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
  redirect(`/sign-in${next}`);
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireApproved();
  if (!user.isAdmin) redirect("/");
  return user;
}
