import Link from "next/link";

import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { DateBlock, WindowBlock } from "@/components/date-block";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import {
  formatTimeInHousehold,
  formatWeekdayDayMonth,
  relativeDayLabel,
  todayInHousehold,
  windowSentence,
  type PlainDate,
} from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { getOrigin } from "@/server/services/household";
import {
  datesScreen,
  previewAntenatalSeries,
  type ScheduledEvent,
} from "@/server/services/schedule";

import { createSeriesAction } from "./actions";

/**
 * S6 — Dates.
 *
 * Holds fixed appointments and multi-week windows without confusing them. A
 * window gets a different *shape* — two numbers split by a rule — and the words
 * to go with it, never a different colour. Turning up on a day that was never
 * required is the failure this screen exists to prevent.
 *
 * Rows say what is still needed of you. A window with no action reads as done
 * when it isn't, so "Nothing booked yet" is part of the row rather than a
 * state you have to infer.
 *
 * No money toggle: there are no amounts on this screen. No notifications are
 * designed here either — reminders belong to the chat assistant.
 */
export default async function Dates() {
  await requireApproved("/dates");

  const today = todayInHousehold();
  const [{ coming, past, withPhotos }, origin, proposal] = await Promise.all([
    datesScreen(today),
    getOrigin(),
    previewAntenatalSeries(today),
  ]);

  // Tomorrow's is promoted out of the list: it is the one you act on tonight.
  const promoted =
    coming[0] && relativeDayLabel(coming[0].onDate, today) !== null
      ? coming[0]
      : null;
  const rest = promoted ? coming.slice(1) : coming;

  return (
    <main className="px-[18px] py-[20px]">
      <header className="mb-[13px] flex items-end justify-between gap-3">
        <div>
          <p className="text-ink2 text-[13px]">
            {formatWeekdayDayMonth(today)} ·{" "}
            <span className="tabular text-[12.5px]">
              {coming.length} coming up
            </span>
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Dates
          </h1>
        </div>
        <Link href="/dates/new">
          <Chip tone="outline">+ Add</Chip>
        </Link>
      </header>

      <Stack>
        {promoted && (
          <Link href={`/dates/${promoted.id}`}>
            <Card className="border-ink gap-[9px]">
              <div className="flex items-baseline justify-between gap-3">
                <Chip tone="solid">
                  {relativeDayLabel(promoted.onDate, today)}
                </Chip>
                <span className="tabular text-ink2 text-[13px]">
                  {whenLine(promoted)}
                </span>
              </div>
              <h2 className="text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">
                {promoted.title}
              </h2>
              <p className="text-[14px]">{whoAndWhere(promoted)}</p>
              {promoted.prepNotes && (
                <div className="border-ln flex items-baseline justify-between gap-4 border-t pt-[10px] text-[14.5px]">
                  <span className="text-ink2">Bring</span>
                  <span className="text-right font-medium">
                    {promoted.prepNotes}
                  </span>
                </div>
              )}
            </Card>
          </Link>
        )}

        {rest.length > 0 && (
          <section>
            <div className="mb-[9px]">
              <SectionLabel>Coming up</SectionLabel>
            </div>
            <Card className="px-[16px] py-[2px]">
              {rest.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </Card>
          </section>
        )}

        {coming.length === 0 && (
          <Card>
            <EmptyState
              headline="Nothing coming up."
              sub="Add the first one, or let the check-ups be worked out from the due date."
              action={{ label: "Add a date", href: "/dates/new" }}
            />
          </Card>
        )}

        {/* Nobody should have to type fifteen appointments. */}
        {proposal.length > 0 && origin && (
          <Card className="border-ln border-dashed bg-transparent">
            <h2 className="text-[15.5px] font-medium">
              Work out the check-ups from the due date?
            </h2>
            <p className="text-ink2 mt-[4px] text-[13px]">
              {proposal.length} of them, every 4 weeks to 28 weeks, every 2
              weeks to 36, then weekly. Each one is a week to ring and book
              inside, not a day you have been given.
            </p>
            <form action={createSeriesAction} className="mt-[13px]">
              <SubmitButton
                busyLabel="Putting them in…"
                className="border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border text-[14.5px] font-medium"
              >
                Put all {proposal.length} in
              </SubmitButton>
            </form>
          </Card>
        )}

        {past.length > 0 && (
          <Link href="/dates/past">
            <Card className="flex-row items-center justify-between gap-3">
              <span className="flex flex-col gap-[2px]">
                <span className="text-[15.5px] font-medium">Been and done</span>
                <span className="text-ink2 tabular text-[13px]">
                  {past.length} {past.length === 1 ? "date" : "dates"}
                  {withPhotos > 0 &&
                    ` · ${withPhotos} ${withPhotos === 1 ? "has" : "have"} scan photos`}
                </span>
              </span>
              <span aria-hidden className="text-ink3">
                ›
              </span>
            </Card>
          </Link>
        )}

        <div className="border-ln rounded-[14px] border border-dashed px-[16px] py-[15px]">
          <p className="text-ink2 text-[13px]">
            The whole first-year immunisation list appears once the baby is
            born.
          </p>
        </div>
      </Stack>
    </main>
  );
}

/** A period is two numbers split by a rule. An appointment is one number. */
function EventRow({ event }: { event: ScheduledEvent }) {
  return (
    <Link
      href={`/dates/${event.id}`}
      className="border-ln flex items-start gap-[14px] border-b py-[13px] last:border-b-0"
    >
      <span className="shrink-0 basis-[46px]">
        {event.isWindow ? (
          <WindowBlock
            from={event.windowStart as PlainDate}
            to={event.windowEnd as PlainDate}
          />
        ) : (
          <DateBlock date={event.onDate} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[15.5px] font-medium tracking-[-0.005em]">
          {event.title}
        </span>
        <span className="text-[13px]">
          {event.isWindow ? (
            // The shape says it is a period; the words say it again, because
            // this is the one thing that must not be misread.
            <span className="text-ink font-medium">
              {windowSentence(
                event.windowStart as PlainDate,
                event.windowEnd as PlainDate,
              )}
            </span>
          ) : (
            <span className="text-ink2">{whenLine(event)}</span>
          )}
          <span className="text-ink2">
            {event.hospitalName || event.locationText
              ? ` · ${event.hospitalName ?? event.locationText}`
              : ""}
          </span>
        </span>
        {/* What is still needed of you. A window with no action reads as done
            when it isn't. */}
        <span className="text-ink3 text-[12px]">{stillNeeded(event)}</span>
      </span>
      <span aria-hidden className="text-ink3 shrink-0">
        ›
      </span>
    </Link>
  );
}

function whenLine(event: ScheduledEvent): string {
  if (event.isWindow) {
    return windowSentence(
      event.windowStart as PlainDate,
      event.windowEnd as PlainDate,
    );
  }
  return `${formatWeekdayDayMonth(event.onDate)} · ${formatTimeInHousehold(
    event.startsAt!,
  )}`;
}

function whoAndWhere(event: ScheduledEvent): string {
  return (
    [
      event.practitioner,
      event.hospitalName ?? event.locationText,
      event.attendees?.length ? event.attendees.join(" and ") : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Nothing written down yet"
  );
}

/** In her words, and always naming who has to act. */
function stillNeeded(event: ScheduledEvent): string {
  if (event.source === "idai_schedule") {
    return "From the IDAI schedule · your paediatrician decides";
  }
  if (event.source === "antenatal_pattern") {
    return "Ring them to book a slot · nothing booked yet";
  }
  if (event.isWindow) return "There is no single right day";
  if (event.prepNotes) return event.prepNotes;
  if (event.status === "planned") return "Nothing booked yet";
  return "Booked";
}
