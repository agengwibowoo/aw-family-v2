import { redirect } from "next/navigation";

import { Card } from "@/components/card";
import {
  formatFullDate,
  plainDateInHousehold,
  todayInHousehold,
} from "@/domain/dates";
import { getCaller, landingTabFor } from "@/server/auth";
import { listAdmins } from "@/server/services/members";

import { askAgainAction } from "./actions";
import { SignInButton, SignOutButton } from "./sign-in-button";

/**
 * S14 — Getting in.
 *
 * Three states, each with a way out. An access screen with no action is a dead
 * end, and that was the original bug.
 */

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const caller = await getCaller();

  if (caller.kind === "approved") {
    // A deep link wins: land on the screen the link pointed at, not on a tab.
    // Otherwise the account chooses which tab it lands on, and nothing else —
    // both accounts see the same four tabs and the same data.
    redirect(
      next && next.startsWith("/") ? next : landingTabFor(caller.user.who),
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-[18px] py-[26px]">
      {caller.kind === "signed_out" && <SignedOut next={next} error={error} />}
      {caller.kind === "pending" && <Waiting user={caller.user} />}
      {caller.kind === "blocked" && <NoLongerIn user={caller.user} />}
    </main>
  );
}

function SignedOut({ next, error }: { next?: string; error?: string }) {
  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        This is a private app for one family.
      </h1>
      <p className="text-ink2 mt-[8px] text-[13px]">
        Sign in and someone here will let you in.
      </p>
      {error && (
        <p className="text-ink2 mt-[8px] text-[13px]">
          That didn&apos;t work. Try once more.
        </p>
      )}
      <div className="mt-[26px]">
        <SignInButton next={next} />
      </div>
    </>
  );
}

async function Waiting({
  user,
}: {
  user: { id: string; email: string; requestedAt: Date };
}) {
  // Say who has to act, by name. "An administrator" is not a person.
  const admins = await listAdmins();

  const who =
    admins.length > 0
      ? (admins[0].displayName ?? admins[0].email)
      : "Whoever set this up";

  const askedOn = plainDateInHousehold(user.requestedAt);
  const isToday = askedOn === todayInHousehold();

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        You&apos;re signed in. Someone has to let you in.
      </h1>
      <Card className="mt-[13px]">
        <p className="text-[14.5px]">
          <span className="font-medium">{who}</span> can do it.
        </p>
        <p className="text-ink2 mt-[6px] text-[13px]">
          You asked {isToday ? "today" : `on ${formatFullDate(askedOn)}`}. Nothing has been sent to
          them — they&apos;ll see it next time they open the app.
        </p>
        <p className="text-ink3 mt-[6px] text-[13px]">{user.email}</p>
      </Card>

      <div className="mt-[26px] flex flex-col gap-[12px]">
        <form action={askAgainAction}>
          <button
            type="submit"
            className="bg-ac flex min-h-[52px] w-full items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white"
          >
            Ask again
          </button>
        </form>
        <SignOutButton />
      </div>
    </>
  );
}

function NoLongerIn({ user }: { user: { email: string; decidedAt: Date | null } }) {
  const when = user.decidedAt
    ? formatFullDate(plainDateInHousehold(user.decidedAt))
    : null;

  return (
    <>
      {/* A fact with a date. Never an accusation, never a bare error. */}
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        This account can&apos;t get in any more.
      </h1>
      <p className="text-ink2 mt-[8px] text-[13px]">
        {when ? `Access was turned off on ${when}.` : "Access was turned off."}{" "}
        If that looks wrong, ask someone in the household.
      </p>
      <p className="text-ink3 mt-[8px] text-[13px]">{user.email}</p>
      <div className="mt-[26px]">
        <SignOutButton />
      </div>
    </>
  );
}
