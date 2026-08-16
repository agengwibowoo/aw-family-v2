import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { formatFullDate, plainDateInHousehold } from "@/domain/dates";
import { requireAdmin } from "@/server/auth";
import { listMembers, type AppUserRow } from "@/server/services/members";

import { approveAction, blockAction } from "./actions";

/**
 * Who can get in.
 *
 * A reduced S15: waiting requests first, because they are the only rows that
 * ever need action, then the household. The full screen — turned-off accounts
 * with a "let back in" affordance, and the seam where a limited role would go —
 * is deferred.
 */
export default async function Who() {
  const admin = await requireAdmin();
  const { waiting, household, turnedOff } = await listMembers();

  return (
    <main className="px-[18px] py-[20px]">
      <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
        Who can get in
      </h1>

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
                    <button
                      type="submit"
                      className="bg-ac flex min-h-[52px] w-full items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white"
                    >
                      Let them in
                    </button>
                  </form>
                  <form action={blockAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="border-ln2 text-ink2 min-h-[52px] w-[112px] rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap"
                    >
                      Turn off
                    </button>
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
                    <button
                      type="submit"
                      className="text-ink2 text-[13px] underline underline-offset-2"
                    >
                      Turn off
                    </button>
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
                <form action={approveAction} className="shrink-0">
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="text-acl text-[13px] underline underline-offset-2"
                  >
                    Let back in
                  </button>
                </form>
              </div>
            ))}
          </Card>
        </section>
      )}
    </main>
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
