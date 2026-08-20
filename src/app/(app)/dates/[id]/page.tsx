import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { UNDO_BUTTON } from "@/components/confirmation";
import { Chip } from "@/components/chip";
import { KeyValue } from "@/components/key-value";
import { Money, MoneyToggle } from "@/components/money";
import { PhotoSlot } from "@/components/photo-slot";
import { ProgressBar } from "@/components/progress";
import { SubmitButton } from "@/components/submit-button";
import {
  daysBetween,
  formatDayMonth,
  formatTimeInHousehold,
  formatWeekdayDayMonth,
  relativeDayLabel,
  todayInHousehold,
  windowSentence,
  type PlainDate,
} from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { getEvent, type ScheduledEvent } from "@/server/services/schedule";
import { getPapersPack } from "@/server/services/papers";
import { getOrigin } from "@/server/services/household";

import { markDoneAction, putDateBackAction, setDayAction } from "../actions";

/**
 * S7 — One date.
 *
 * Before: what to bring. After: what happened. The halves swap by the date,
 * never by a tab she has to choose — she should not have to tell the app
 * whether something has happened yet.
 *
 * A period is a third variant with two honest endings, because a window can
 * either be given a day or be over.
 *
 * A date taken off the list gets a fourth, because every bottom bar here offers
 * something — "It's done", "Set a day" — that means nothing for something that
 * is not happening. The only thing left to say about it is the way back.
 */
export default async function OneDate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/dates/${id}`);

  const event = await getEvent(id);
  if (!event) notFound();

  const today = todayInHousehold();
  const isDone = event.status === "done";
  const isPast = !event.isWindow && event.onDate < today;

  if (event.status === "cancelled") return <OffTheListVariant event={event} />;
  if (event.isWindow && !isDone) return <WindowVariant event={event} today={today} />;
  if (isDone || isPast) return <AfterVariant event={event} />;
  return <BeforeVariant event={event} today={today} />;
}

function Header({
  event,
  supporting,
  right,
}: {
  event: ScheduledEvent;
  supporting: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
      <div className="flex min-w-0 items-end gap-[12px]">
        <Link href="/dates" aria-label="Back" className="text-ink2 text-[20px] leading-none">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="text-ink2 tabular text-[13px]">{supporting}</p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            {event.title}
          </h1>
        </div>
      </div>
      {right}
    </header>
  );
}

/** What to bring. The time is the largest thing on the screen. */
async function BeforeVariant({
  event,
  today,
}: {
  event: ScheduledEvent;
  today: PlainDate;
}) {
  const relative = relativeDayLabel(event.onDate, today);
  const origin = await getOrigin();
  // The Bring list reaches into the papers pack rather than repeating it.
  const pack = await getPapersPack(origin?.dueDate ?? today);

  return (
    <>
      <Header
        event={event}
        supporting={`${relative ? `${relative} · ` : ""}${formatWeekdayDayMonth(event.onDate)}`}
        right={<MoneyToggle />}
      />

      <div className="px-[18px] pb-[20px]">
        <Stack>
          <Card className="border-ink gap-[6px]">
            <p className="tabular text-[34px] leading-none font-semibold tracking-[-0.035em]">
              {formatTimeInHousehold(event.startsAt!)}
            </p>
            <p className="text-[15px]">
              {[event.practitioner, event.hospitalName ?? event.locationText]
                .filter(Boolean)
                .join(" · ") || "Nowhere written down yet"}
            </p>
            {event.attendees?.length ? (
              <p className="text-ink2 text-[13px]">
                {event.attendees.join(" and ")} going
              </p>
            ) : null}
          </Card>

          {pack.lines.length > 0 && (
            <Card className="gap-[2px] px-[16px] py-[13px]">
              <div className="pb-[5px]">
                <SectionLabel>Bring</SectionLabel>
              </div>
              {pack.lines.slice(0, 4).map((line) => (
                <div
                  key={line.documentId}
                  className="border-ln flex items-center justify-between gap-3 border-b py-[11px] last:border-b-0"
                >
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span className="text-[14.5px]">{line.name}</span>
                    <span className="text-ink3 text-[12px]">
                      In the papers pack
                    </span>
                  </span>
                  <Chip tone={line.ready ? "solid" : "outline"}>
                    {line.ready ? "Ready" : "Not yet"}
                  </Chip>
                </div>
              ))}
              <Link
                href="/papers"
                className="text-acl pt-[10px] text-[14.5px] font-medium"
              >
                The whole papers pack
              </Link>
            </Card>
          )}

          {event.prepNotes && (
            <Card>
              <SectionLabel>Before you go</SectionLabel>
              {/* Plain sentences, never "fasting required (8h)". */}
              <p className="mt-[6px] text-[14.5px] leading-[1.45]">
                {event.prepNotes}
              </p>
            </Card>
          )}

          <Card className="py-0">
            <KeyValue
              label="Likely to cost"
              value={event.costIdr ? <Money amount={event.costIdr} /> : undefined}
              mono
            />
            {event.locationText && (
              <KeyValue label="Where" value={event.locationText} />
            )}
          </Card>
        </Stack>
      </div>

      <BottomBar>
        <form action={markDoneAction} className="flex-1">
          <input type="hidden" name="id" value={event.id} />
          <BarPrimary type="submit" busyLabel="Saving…">
            It&rsquo;s done
          </BarPrimary>
        </form>
        <BarSecondary href={`/dates/${event.id}/edit`} width={126}>
          Change it
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/** What happened. The scan photos come first — they are what she comes back for. */
function AfterVariant({ event }: { event: ScheduledEvent }) {
  const photos = event.imagePaths ?? [];

  return (
    <>
      <Header
        event={event}
        supporting={
          event.startsAt
            ? `${formatWeekdayDayMonth(event.onDate)} · ${formatTimeInHousehold(event.startsAt)}`
            : formatWeekdayDayMonth(event.onDate)
        }
        right={<Chip tone="solid">Done</Chip>}
      />

      <div className="px-[18px] pb-[20px]">
        <Stack>
          <section>
            <div className="mb-[9px]">
              <SectionLabel>Scan photos</SectionLabel>
            </div>
            <div className="flex gap-[9px] overflow-x-auto">
              {photos.map((path) => (
                <PhotoSlot key={path} size="scan" src={path} alt="" />
              ))}
              <PhotoSlot size="scan" />
            </div>
          </section>

          {event.outcomeNotes && (
            <Card>
              <SectionLabel>What the doctor said</SectionLabel>
              {/* One paragraph in her words. Fields here would be blank most
                  of the time. */}
              <p className="mt-[6px] text-[14.5px] leading-[1.45]">
                {event.outcomeNotes}
              </p>
            </Card>
          )}

          <Card className="py-0">
            {event.practitioner && (
              <KeyValue label="Who" value={event.practitioner} />
            )}
            <KeyValue
              label="Where"
              value={event.hospitalName ?? event.locationText ?? undefined}
            />
            <KeyValue
              label="Cost"
              value={event.costIdr ? <Money amount={event.costIdr} /> : undefined}
              mono
            />
          </Card>
        </Stack>
      </div>

      <BottomBar>
        <BarPrimary href={`/dates/${event.id}/edit`}>Add a photo</BarPrimary>
        <BarSecondary href={`/dates/${event.id}/edit`} width={112}>
          Add a note
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/**
 * Taken off the list.
 *
 * Nothing underneath it was touched, so the only thing this screen has to do is
 * say so and offer the way back. It is the path that does not expire, once the
 * fifteen-minute card has gone.
 */
function OffTheListVariant({ event }: { event: ScheduledEvent }) {
  return (
    <>
      <Header event={event} supporting="Off the list" />

      <div className="px-[18px] pb-[20px]">
        <Card>
          <SectionLabel>Off the list</SectionLabel>
          <p className="mt-[6px] text-[14.5px] leading-[1.45]">
            This one is not happening. Everything it knew is still here — what
            it was going to cost, what to bring, and any photos and notes on it.
          </p>
          <form action={putDateBackAction} className="mt-[14px]">
            <input type="hidden" name="id" value={event.id} />
            <SubmitButton busyLabel="Putting it back…" className={UNDO_BUTTON}>
              Put it back
            </SubmitButton>
          </form>
        </Card>
      </div>

      <BottomBar>
        <BarSecondary href="/dates" width={160}>
          All dates
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/**
 * A period.
 *
 * The bar between the two dates fills as the period passes — it measures time
 * going by, not progress being made, because there is nothing to make progress
 * on until somebody rings.
 */
function WindowVariant({
  event,
  today,
}: {
  event: ScheduledEvent;
  today: PlainDate;
}) {
  const from = event.windowStart as PlainDate;
  const to = event.windowEnd as PlainDate;
  const span = Math.max(1, daysBetween(from, to));
  const gone = Math.min(span, Math.max(0, daysBetween(from, today)));

  return (
    <>
      <Header
        event={event}
        supporting={
          event.type === "immunisation" ? "For the baby" : "Sometime in here"
        }
        // Not in the bottom bar. A period has exactly two honest endings —
        // pin it to a day, or record that it happened — and a third button
        // there would make editing look like one of them.
        right={
          <Link
            href={`/dates/${event.id}/edit`}
            className="text-ink2 shrink-0 text-[13px] font-semibold"
          >
            Change it
          </Link>
        }
      />

      <div className="px-[18px] pb-[20px]">
        <Stack>
          <Card className="border-ink gap-[8px]">
            <h2 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]">
              {windowSentence(from, to)}
            </h2>
            <p className="text-[14px]">
              Nothing is booked. There is no single right day — anywhere in this
              period is fine.
            </p>
            <div className="mt-[4px] flex items-center gap-[10px]">
              <span className="tabular text-ink2 text-[13px] uppercase">
                {formatDayMonth(from)}
              </span>
              <span className="flex-1">
                <ProgressBar have={gone} need={span} />
              </span>
              <span className="tabular text-ink2 text-[13px] uppercase">
                {formatDayMonth(to)}
              </span>
            </div>
          </Card>

          {event.source === "idai_schedule" && (
            <Card>
              <SectionLabel>Where this came from</SectionLabel>
              <p className="text-ink2 mt-[6px] text-[13px] leading-[1.45]">
                The IDAI childhood immunisation schedule, keyed to the birth
                date. Your paediatrician decides the actual day — change it here
                once you know.
              </p>
            </Card>
          )}

          {event.source === "antenatal_pattern" && (
            <Card>
              <SectionLabel>Where this came from</SectionLabel>
              <p className="text-ink2 mt-[6px] text-[13px] leading-[1.45]">
                The usual check-up pattern, worked out from the due date
                {event.sourceVersion ? ` — ${event.sourceVersion}` : ""}. Ring
                the clinic to book a slot inside this period.
              </p>
            </Card>
          )}

          <Card className="py-0">
            <KeyValue
              label="Who"
              value={
                event.attendees?.length ? event.attendees.join(" and ") : undefined
              }
            />
            <KeyValue label="Bring" value={event.prepNotes ?? undefined} />
            <KeyValue
              label="Where"
              value={event.hospitalName ?? event.locationText ?? undefined}
            />
          </Card>

          <Card>
            <SectionLabel>Set a day</SectionLabel>
            <form action={setDayAction} className="mt-[9px] flex gap-[10px]">
              <input type="hidden" name="id" value={event.id} />
              <input
                type="date"
                name="date"
                defaultValue={from}
                min={from}
                max={to}
                aria-label="Which day"
                className="bg-sf border-ln2 text-ink tabular min-h-[52px] flex-1 rounded-[11px] border px-[12px] text-[15.5px]"
              />
              <input
                type="time"
                name="time"
                defaultValue="09:00"
                aria-label="What time"
                className="bg-sf border-ln2 text-ink tabular min-h-[52px] w-[110px] rounded-[11px] border px-[12px] text-[15.5px]"
              />
            </form>
          </Card>
        </Stack>
      </div>

      {/* Two actions, because a period has two honest endings. */}
      <BottomBar>
        <form action={setDayAction} className="flex-1">
          <input type="hidden" name="id" value={event.id} />
          <input type="hidden" name="date" value={from} />
          <BarPrimary type="submit" busyLabel="Saving…">
            Set a day
          </BarPrimary>
        </form>
        <form action={markDoneAction}>
          <input type="hidden" name="id" value={event.id} />
          <BarSecondary type="submit" width={104} busyLabel="Saving…">
            It&rsquo;s done
          </BarSecondary>
        </form>
      </BottomBar>
    </>
  );
}
