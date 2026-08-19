import Link from "next/link";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { SubmitButton } from "@/components/submit-button";
import { formatFullDate, plainDateInHousehold } from "@/domain/dates";
import { requireAdmin } from "@/server/auth";
import { listMembers, type AppUserRow } from "@/server/services/members";

import { approveAction, blockAction, unblockAction } from "./actions";

/**
 * S15 — Who can get in.
 *
 * Waiting requests first, because they are the only rows that ever need
 * action. Then the household, then turned-off accounts with a way back in —
 * turning somebody off is a decision, not a deletion, so it has to be
 * reversible from the same screen that made it.
 *
 * "Manage" is the seam where a future limited role would go — a grandparent
 * or a nanny who can only mark things clean or dirty. Not designed, not
 * blocked, and deliberately not built.
 */
export default async function Who({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const admin = await requireAdmin();
  const { invite } = await searchParams;
  const { waiting, household, turnedOff } = await listMembers();

  return (
    <>
    <main className="px-[18px] py-[20px]">
      <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
        Who can get in
      </h1>

      {invite === "1" && (
        <Card className="border-ink mt-[16px]">
          <h2 className="text-[17.5px] font-semibold tracking-[-0.015em]">
            Adding somebody takes two steps.
          </h2>
          <p className="text-ink2 mt-[6px] text-[14.5px] leading-[1.45]">
            Ask them to open this app and sign in with their Google account.
            Their name then appears here, under Waiting, and you let them in.
          </p>
          <p className="text-ink3 mt-[6px] text-[13px]">
            Nothing is sent from here — signing in is what puts them on this
            screen.
          </p>
          <Link href="/who" className="text-acl mt-[13px] inline-block text-[14.5px] font-medium">
            Close
          </Link>
        </Card>
      )}

      {waiting.length > 0 && (
        <section className="mt-[20px]">
          <div className="mb-[9px]">
            <SectionLabel>Waiting</SectionLabel>
          </div>
          <Stack>
            {waiting.map((m) => (
              <Card key={m.id}>
                <Person member={m} />
                <div className="mt-[13px] flex gap-[12px]">
                  <form action={approveAction} className="flex-1">
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton
                      busyLabel="Letting them in…"
                      className="bg-ac flex min-h-[52px] w-full items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white"
                    >
                      Let them in
                    </SubmitButton>
                  </form>
                  <form action={blockAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton
                      busyLabel="Saving…"
                      className="border-ln2 text-ink2 min-h-[52px] w-[112px] rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap"
                    >
                      Turn off
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            ))}
          </Stack>
        </section>
      )}

      <section className="mt-[20px]">
        <div className="mb-[9px]">
          <SectionLabel>The household</SectionLabel>
        </div>
        <Card className="py-0">
          {household.map((m) => (
            <div
              key={m.id}
              className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
            >
              <Person member={m} />
              <span className="flex shrink-0 items-center gap-2">
                {m.isAdmin && <Chip tone="outline">Can let people in</Chip>}
                {m.id !== admin.id && (
                  <form action={blockAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton className="text-ink2 text-[13px] underline underline-offset-2">
                      Turn off
                    </SubmitButton>
                  </form>
                )}
              </span>
            </div>
          ))}
        </Card>
      </section>

      {turnedOff.length > 0 && (
        <section className="mt-[20px]">
          <div className="mb-[9px]">
            <SectionLabel>Turned off</SectionLabel>
          </div>
          <Card className="py-0">
            {turnedOff.map((m) => (
              <div
                key={m.id}
                className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
              >
                <Person member={m} />
                <form action={unblockAction} className="shrink-0">
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton className="text-acl text-[13px] underline underline-offset-2">
                    Let back in
                  </SubmitButton>
                </form>
              </div>
            ))}
          </Card>
        </section>
      )}
    </main>

    <BottomBar>
      <BarPrimary href="/who?invite=1">Invite someone</BarPrimary>
    </BottomBar>
    </>
  );
}

function Person({ member }: { member: AppUserRow }) {
  const asked = formatFullDate(plainDateInHousehold(member.requestedAt));
  return (
    <span className="flex min-w-0 flex-col gap-[2px]">
      <span className="text-[15.5px] font-medium tracking-[-0.005em]">
        {member.displayName ?? member.email}
      </span>
      <span className="text-ink2 text-[13px]">
        {member.displayName ? `${member.email} · ` : ""}
        asked {asked}
      </span>
    </span>
  );
}
