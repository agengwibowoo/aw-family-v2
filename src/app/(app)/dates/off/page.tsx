import Link from "next/link";

import { BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, Stack } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { requireApproved } from "@/server/auth";
import { datesScreen } from "@/server/services/schedule";

/**
 * Dates taken off the list — the clinic rang, the class was called off, or the
 * row was typed twice.
 *
 * Not the same screen as Been and done, and deliberately not the same word.
 * That one means it happened. This one means it did not, and everything the
 * date knew is still underneath it.
 *
 * The design handoff has no screen for this. Until it does, this takes its
 * values verbatim from `/hospitals/removed` and invents nothing — the same
 * caveat ADR-0008 sets out.
 */
export default async function DatesOff() {
  await requireApproved("/dates/off");

  const { off } = await datesScreen();

  return (
    <>
      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 tabular text-[13px]">
          {off.length === 1
            ? "1 date, taken off the list"
            : `${off.length} dates, taken off the list`}
        </p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Off the list
        </h1>
      </header>

      <div className="px-[18px]">
        {off.length === 0 ? (
          <Card>
            <EmptyState headline="Nothing has been taken off the list." />
          </Card>
        ) : (
          <Stack>
            {off.map((event) => (
              <Link key={event.id} href={`/dates/${event.id}`} className="block">
                <div className="py-[12px] opacity-55">
                  <p className="text-[15.5px] font-medium">{event.title}</p>
                  <p className="text-ink2 mt-[2px] text-[13px]">
                    Open it to put it back.
                  </p>
                </div>
              </Link>
            ))}
          </Stack>
        )}
      </div>

      <BottomBar>
        <BarSecondary href="/dates" width={160}>
          All dates
        </BarSecondary>
      </BottomBar>
    </>
  );
}
