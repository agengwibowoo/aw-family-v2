import Link from "next/link";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PhotoSlot } from "@/components/photo-slot";
import {
  formatWeekdayDayMonth,
  todayInHousehold,
} from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { datesScreen } from "@/server/services/schedule";
import { signedScanUrls } from "@/server/services/scans";

/**
 * Been and done.
 *
 * An archive, not a truncation. It is where the scan photos live, which is the
 * real reason anybody comes back here — so the photo is the first thing in the
 * row rather than a detail two taps down.
 */
export default async function PastDates() {
  await requireApproved("/dates/past");

  const { past } = await datesScreen(todayInHousehold());
  const inOrder = [...past].sort((a, b) => b.onDate.localeCompare(a.onDate));

  // One signing round-trip for the whole screen. The bucket is private, so the
  // stored path is not something an <img> can load on its own.
  const covers = inOrder
    .map((e) => e.imagePaths?.[0])
    .filter((p): p is string => !!p);
  const scanUrls = await signedScanUrls(covers);

  return (
    <>
      <main className="px-[18px] py-[20px]">
        <header className="mb-[13px] flex items-end gap-[12px]">
          <Link href="/dates" aria-label="Back" className="text-ink2 text-[20px] leading-none">
            ‹
          </Link>
          <div>
            <p className="text-ink2 tabular text-[13px]">
              {past.length} {past.length === 1 ? "date" : "dates"}
            </p>
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              Been and done
            </h1>
          </div>
        </header>

        {inOrder.length === 0 ? (
          <Card>
            <EmptyState headline="Nothing has been and gone yet." />
          </Card>
        ) : (
          <Card className="py-0">
            {inOrder.map((event) => (
              <Link
                key={event.id}
                href={`/dates/${event.id}`}
                className="border-ln flex items-center gap-[12px] border-b py-[12px] last:border-b-0"
              >
                <PhotoSlot
                  size="row"
                  src={
                    event.imagePaths?.[0]
                      ? (scanUrls.get(event.imagePaths[0]) ?? null)
                      : null
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[15.5px] font-medium">
                    {event.title}
                  </span>
                  <span className="text-ink2 text-[13px]">
                    {formatWeekdayDayMonth(event.onDate)}
                    {event.practitioner && ` · ${event.practitioner}`}
                  </span>
                </span>
                <span aria-hidden className="text-ink3 shrink-0">
                  ›
                </span>
              </Link>
            ))}
          </Card>
        )}
      </main>

      <BottomBar>
        <BarPrimary href="/dates">Back to the dates</BarPrimary>
      </BottomBar>
    </>
  );
}
