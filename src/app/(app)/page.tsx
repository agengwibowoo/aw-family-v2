import Link from "next/link";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, Stack } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { countdownLine, currentBand } from "@/domain/age";
import { formatWeekdayDayMonth, todayInHousehold } from "@/domain/dates";
import { getOrigin, listAgeBands } from "@/server/services/household";

/**
 * S1 — Today.
 *
 * Answers "what needs doing today" in one glance. The countdown is deliberately
 * small: the due date is an estimate, and a 42px number would be the loudest
 * and least reliable thing on the screen.
 *
 * The action cards are not wired yet — that is the next piece of work.
 */
export default async function Today() {
  const today = todayInHousehold();
  const origin = await getOrigin();
  const bands = await listAgeBands();
  const band = origin ? currentBand(bands, origin, today) : undefined;

  return (
    <>
      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 text-[13px]">
          {formatWeekdayDayMonth(today)}
          {origin && (
            <>
              {" · "}
              <span className="tabular text-[12.5px]">
                {countdownLine(origin, today)}
              </span>
            </>
          )}
        </p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Today
        </h1>
      </header>

      <div className="px-[18px]">
        {!origin ? (
          <Card>
            <EmptyState
              headline="No due date yet."
              sub="Run supabase/seed-household.sql and this screen fills in."
            />
          </Card>
        ) : (
          <Stack>
            <Card>
              <EmptyState
                headline="Nothing needs doing today."
                sub={
                  band
                    ? `Nothing on the list yet for ${band.name}.`
                    : undefined
                }
              />
            </Card>

            {/* Temporary entry point. These live off the Money tab in the
                design, and that screen is deferred until after the birth. */}
            <Card className="py-0">
              {[
                { href: "/hospitals", label: "Where to give birth" },
                { href: "/insurance", label: "Your insurance" },
                { href: "/papers", label: "Papers for the hospital" },
                { href: "/who", label: "Who can get in" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-ln flex min-h-[52px] items-center justify-between border-b text-[15.5px] font-medium last:border-b-0"
                >
                  {link.label}
                  <span aria-hidden className="text-ink3">
                    ›
                  </span>
                </Link>
              ))}
            </Card>
          </Stack>
        )}
      </div>

      <BottomBar>
        <BarPrimary href="/list">Add what we got</BarPrimary>
        <BarSecondary href="/list">Find a thing</BarSecondary>
      </BottomBar>
    </>
  );
}
