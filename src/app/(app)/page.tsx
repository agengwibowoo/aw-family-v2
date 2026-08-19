import Link from "next/link";

import { ActionCard } from "@/components/action-card";
import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { DateBlock, WindowBlock } from "@/components/date-block";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress";
import { SavedConfirmation } from "@/components/saved-confirmation";
import { SubmitButton } from "@/components/submit-button";
import { bandRange, countdownLine, currentBand } from "@/domain/age";
import {
  formatTimeInHousehold,
  formatWeekdayDayMonth,
  relativeDayLabel,
  todayInHousehold,
  windowSentence,
  type PlainDate,
} from "@/domain/dates";
import { countOf } from "@/domain/status";
import { nothingToDoLine, rankTodayCards } from "@/domain/today";
import { requireApproved } from "@/server/auth";
import { readDismissed } from "@/server/saved";
import { getOrigin, listAgeBands } from "@/server/services/household";
import { nextEvent } from "@/server/services/schedule";
import { listThings } from "@/server/services/things";

import { laterAction } from "./actions";

/**
 * S1 — Today.
 *
 * Answers "what needs doing today" in one glance. The countdown is deliberately
 * small: the due date is an estimate, the birth will come sooner or later than
 * the date, and a 42px number would be the loudest and least reliable thing on
 * the screen. Post-birth it reads "6 weeks old" in the same slot — the screen
 * does not change shape on the due date, only its contents.
 *
 * At most three things to *do*. The appointment is a fact rather than a task:
 * it has no "Later" and does not count against the three.
 *
 * The two bottom actions never disappear, on any state.
 */
export default async function Today() {
  await requireApproved("/");

  const today = todayInHousehold();
  const [origin, bands, dismissed, next] = await Promise.all([
    getOrigin(),
    listAgeBands(),
    readDismissed(),
    nextEvent(),
  ]);

  const band = origin ? currentBand(bands, origin, today) : undefined;
  const things = await listThings();

  const bandDeadlines = new Map<number, PlainDate | null>(
    bands.map((b) => [b.id, origin ? bandRange(b, origin).end : null]),
  );

  const cards = rankTodayCards(things, {
    currentBandId: band?.id,
    bandDeadlines,
    today,
    dismissed,
  });

  const inBand = band ? things.filter((t) => t.bandId === band.id) : [];
  const got = inBand.filter((t) => t.status !== "still_need").length;

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

      <div className="px-[18px] pb-[20px]">
        {!origin ? (
          <Card>
            <EmptyState
              headline="No due date yet."
              sub="Run supabase/seed-household.sql and this screen fills in."
            />
          </Card>
        ) : (
          <Stack>
            <SavedConfirmation />

            {cards.length > 0 ? (
              <>
                <SectionLabel>Needs doing</SectionLabel>
                {cards.map((card) => (
                  <ActionCard
                    key={card.id}
                    title={card.title}
                    reason={card.reason}
                    actionLabel="Add what we got"
                    href={`/add?thing=${card.id}&from=today`}
                    onLater={
                      // Hides it for seven days and promotes the next one.
                      <form action={laterAction}>
                        <input type="hidden" name="id" value={card.id} />
                        <SubmitButton className="border-ln2 text-ink2 min-h-[52px] shrink-0 basis-[84px] rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap">
                          Later
                        </SubmitButton>
                      </form>
                    }
                  />
                ))}
              </>
            ) : (
              <Card>
                <EmptyState
                  headline="Nothing needs doing today."
                  // Derived from the real counts, always.
                  sub={nothingToDoLine({
                    bandName: band?.name ?? null,
                    got,
                    things: inBand.length,
                    nextDeadline: band ? (bandDeadlines.get(band.id) ?? null) : null,
                    nextDateOn: next?.onDate ?? null,
                  })}
                />
              </Card>
            )}

            {/* A fact, not a task. No "Later", and it does not count against
                the three. */}
            {next && (
              <Link href={`/dates/${next.id}`}>
                <Card className="flex-row items-center gap-[14px]">
                  <span className="shrink-0">
                    {next.isWindow ? (
                      <WindowBlock
                        from={next.windowStart as PlainDate}
                        to={next.windowEnd as PlainDate}
                      />
                    ) : (
                      <DateBlock date={next.onDate} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="text-[17.5px] font-semibold tracking-[-0.015em]">
                      {next.title}
                    </span>
                    <span className="text-ink2 text-[13px]">
                      {whenLine(next, today)}
                    </span>
                    {next.prepNotes && (
                      <span className="text-ink2 text-[13px]">
                        Bring {next.prepNotes}
                      </span>
                    )}
                  </span>
                </Card>
              </Link>
            )}

            {band && inBand.length > 0 && (
              <Card className="gap-[9px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15.5px] font-medium tracking-[-0.005em]">
                    {band.name}
                  </span>
                  <span className="tabular text-ink2 shrink-0 text-[13px]">
                    {countOf(got, inBand.length)}
                  </span>
                </div>
                <ProgressBar have={got} need={inBand.length} />
              </Card>
            )}
          </Stack>
        )}
      </div>

      <BottomBar>
        <BarPrimary href="/add?from=today">Add what we got</BarPrimary>
        <BarSecondary href="/find" width={134}>
          Find a thing
        </BarSecondary>
      </BottomBar>
    </>
  );
}

function whenLine(
  event: { isWindow: boolean; onDate: PlainDate; startsAt: Date | null; windowStart: string | null; windowEnd: string | null; hospitalName: string | null; locationText: string | null; practitioner: string | null },
  today: PlainDate,
): string {
  const where = [event.practitioner, event.hospitalName ?? event.locationText]
    .filter(Boolean)
    .join(" · ");

  if (event.isWindow) {
    const period = windowSentence(
      event.windowStart as PlainDate,
      event.windowEnd as PlainDate,
    );
    return where ? `${period} · ${where}` : period;
  }

  const relative = relativeDayLabel(event.onDate, today);
  const when = `${relative ?? formatWeekdayDayMonth(event.onDate)} ${formatTimeInHousehold(event.startsAt!)}`;
  return where ? `${when} · ${where}` : when;
}
