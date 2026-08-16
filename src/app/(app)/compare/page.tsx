import Link from "next/link";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { CompareCell } from "@/components/compare-cell";
import { EmptyState } from "@/components/empty-state";
import { Money, MoneyToggle } from "@/components/money";
import { cn } from "@/lib/cn";
import { todayInHousehold } from "@/domain/dates";
import { quoteAgeNote, summariseCover } from "@/domain/insurance";
import { HOSPITAL_DECISION_WORDS, type HospitalDecision } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin } from "@/server/services/household";
import {
  COMPLETENESS_TOTAL,
  coverFor,
  getPolicy,
  listHospitalsForCompare,
  type ComparedHospital,
} from "@/server/services/hospitals";

import { pickAction, ruleOutAction } from "./actions";

/**
 * S4 — Compare.
 *
 * Four narrow columns scrolled sideways with a pinned label column. Two things
 * about this shape were chosen against alternatives and should not be undone
 * casually:
 *
 * The insurance answer is lifted out of the table entirely, into a card above
 * it. In a four-column grid it could only ever be a compressed one-liner, and
 * that was the layout's worst failure — it is the fact that can cause financial
 * harm and it must not compete with a row of numbers.
 *
 * Nothing is below 13px and no value is below 14px. An earlier attempt used
 * 116px columns, which forced 13.5px values and 9.5px chips. The columns were
 * narrowed to 112 and the table simply got wider; it was already scrolling, so
 * width was the cheap thing to spend.
 */

const LABEL_WIDTH = 96;
const COLUMN_WIDTH = 112;

type Cell = { value?: React.ReactNode; note?: string; mono?: boolean };
type Row = { label: string; cell: (h: ComparedHospital) => Cell };

/** Yes, no, or nobody has said. Null is never rendered as "No". */
function yesNo(v: boolean | null): string | undefined {
  return v === null ? undefined : v ? "Yes" : "No";
}

function minutes(v: number | null): string | undefined {
  return v === null ? undefined : `${v} min`;
}

/**
 * The cheapest quote for one sort of birth, with how old the price is.
 *
 * A stale price carries "asked 4 months ago" on the value itself — no legend,
 * no colour. The reader is comparing numbers, and a number nobody has checked
 * since March is a different number.
 */
function price(h: ComparedHospital, deliveryType: string, today: string): Cell {
  const quotes = h.quotes.filter(
    (q) => q.deliveryType === deliveryType && q.priceIdr !== null,
  );
  if (quotes.length === 0) return {};

  const cheapest = quotes.reduce((a, b) =>
    Number(a.priceIdr) <= Number(b.priceIdr) ? a : b,
  );

  return {
    value: <Money amount={cheapest.priceIdr} />,
    note: quoteAgeNote(cheapest.quotedOn, today) ?? undefined,
    mono: true,
  };
}

function rowsFor(today: string): { shown: Row[]; more: Row[] } {
  const shown: Row[] = [
    { label: "In traffic", cell: (h) => ({ value: minutes(h.hospital.driveMinutesPeak), mono: true }) },
    { label: "Normally", cell: (h) => ({ value: minutes(h.hospital.driveMinutesNormal), mono: true }) },
    {
      label: "Baby intensive care",
      cell: (h) => {
        const has = yesNo(h.hospital.hasNicu);
        if (!has) return {};
        // The level is the whole point of the answer when there is one.
        return {
          value:
            has === "Yes" && h.hospital.nicuLevel
              ? `Yes · ${h.hospital.nicuLevel}`
              : has,
        };
      },
    },
    { label: "Open at 2am", cell: (h) => ({ value: yesNo(h.hospital.hasIgd24h) }) },
    { label: "Husband in the room", cell: (h) => ({ value: yesNo(h.hospital.allowsHusbandInRoom) }) },
    { label: "Baby stays with you", cell: (h) => ({ value: yesNo(h.hospital.roomingIn) }) },
    { label: "Normal birth", cell: (h) => price(h, "Normal", today) },
    { label: "Caesar", cell: (h) => price(h, "Caesar", today) },
    {
      label: "Deposit on arrival",
      cell: (h) => ({
        value: h.hospital.depositIdr ? <Money amount={h.hospital.depositIdr} /> : undefined,
        mono: true,
      }),
    },
    // How much you know about a place is part of comparing it.
    {
      label: "Filled in",
      cell: (h) => ({ value: `${h.filled} of ${COMPLETENESS_TOTAL}`, mono: true }),
    },
  ];

  const more: Row[] = [
    { label: "What sort of place", cell: (h) => ({ value: h.hospital.type ?? undefined }) },
    {
      label: "How far",
      cell: (h) => ({
        value: h.hospital.distanceKm ? `${h.hospital.distanceKm} km` : undefined,
        mono: true,
      }),
    },
    { label: "Skin to skin at birth", cell: (h) => ({ value: yesNo(h.hospital.supportsImd) }) },
    { label: "Help with feeding", cell: (h) => ({ value: yesNo(h.hospital.hasLactationConsultant) }) },
    { label: "Photographer allowed", cell: (h) => ({ value: yesNo(h.hospital.allowsPhotographer) }) },
    {
      label: "Papers they want",
      cell: (h) => ({
        value: h.paperCount > 0 ? `${h.paperCount}` : undefined,
        mono: true,
      }),
    },
  ];

  return { shown, more };
}

export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{ rows?: string }>;
}) {
  await requireApproved("/compare");
  const { rows: rowsParam } = await searchParams;
  const showAll = rowsParam === "all";

  const [places, policy, origin] = await Promise.all([
    listHospitalsForCompare(),
    getPolicy(),
    getOrigin(),
  ]);

  if (places.length === 0) {
    return (
      <>
        <Header />
        <div className="px-[18px]">
          <Card>
            <EmptyState
              headline="Nothing to compare yet."
              sub="Add the places you are thinking about and they line up here."
              action={{ label: "Add a place", href: "/hospitals/new" }}
            />
          </Card>
        </div>
      </>
    );
  }

  const today = todayInHousehold();
  const { shown, more } = rowsFor(today);
  const candidateRows = showAll ? [...shown, ...more] : shown;

  // A row where every place is blank tells you nothing about any of them.
  const rows = candidateRows.filter((row) =>
    places.some((h) => {
      const c = row.cell(h);
      return c.value !== undefined && c.value !== null && c.value !== "";
    }),
  );

  const emptyPolicy = {
    insurerName: null,
    policyStartedOn: null,
    maternityWaitingPeriodMonths: null,
    roomEntitlement: null,
  };

  const cover = origin
    ? places
        .map((h) => ({
          hospital: h.hospital,
          summary: summariseCover(
            policy ?? emptyPolicy,
            origin.dueDate,
            coverFor(h.insurers, policy),
          ),
        }))
        .sort((a, b) => a.summary.rank - b.summary.rank)
    : [];

  const inPlay = places.filter((h) => h.hospital.decision !== "ruled_out");
  const leader = inPlay[0]?.hospital;
  const decided = leader?.decision === "picked";

  const tableWidth = LABEL_WIDTH + COLUMN_WIDTH * places.length;

  return (
    <>
      <Header />

      <div className="px-[18px]">
        {/* Lifted out of the table on purpose: it is the fact that can cause
            financial harm, and it must not compete with a row of numbers. */}
        {cover.length > 0 && (
          <Card className="border-ink mb-[12px] gap-[8px]">
            <h2 className="text-ink3 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
              Does insurance cover the birth?
            </h2>
            {cover.map(({ hospital, summary }) => (
              <div
                key={hospital.id}
                className="flex items-start justify-between gap-3 py-[8px]"
              >
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-medium">
                    {hospital.name}
                  </span>
                  {summary.reason && (
                    <span className="text-ink2 block text-[13px]">
                      {summary.reason}
                    </span>
                  )}
                </span>
                <Chip
                  tone={
                    summary.unchecked
                      ? "outline"
                      : summary.rank === 0
                        ? "solid"
                        : "quiet"
                  }
                >
                  {summary.word}
                </Chip>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* The one gesture in the app, so it gets words rather than a shadow you
          have to notice. */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: tableWidth }}>
          <div className="border-ln2 flex border-b">
            <div
              className="bg-bg sticky left-0 z-[2] box-border shrink-0 py-[13px] pl-[18px]"
              style={{ flex: `0 0 ${LABEL_WIDTH}px` }}
            />
            {places.map((h) => (
              <Link
                key={h.hospital.id}
                href={`/hospitals/${h.hospital.id}`}
                className="border-ln box-border shrink-0 border-l px-[9px] py-[13px]"
                style={{ flex: `0 0 ${COLUMN_WIDTH}px` }}
              >
                <span className="block text-[14px] leading-[1.15] font-medium">
                  {h.hospital.name}
                </span>
                <span className="mt-[4px] inline-block">
                  <Chip
                    tone={h.hospital.decision === "picked" ? "solid" : "outline"}
                    className="px-[6px] py-[2px] text-[10.5px]"
                  >
                    {
                      HOSPITAL_DECISION_WORDS[
                        h.hospital.decision as HospitalDecision
                      ]
                    }
                  </Chip>
                </span>
              </Link>
            ))}
          </div>

          {rows.map((row, i) => {
            // Rows alternate so the eye can track one across four columns.
            const surface = i % 2 === 0 ? "bg-sf" : "bg-bg";
            const strong = row.label === "Filled in";
            return (
              <div
                key={row.label}
                className={cn(
                  "flex border-t",
                  strong ? "border-ln2" : "border-ln",
                  surface,
                )}
              >
                {/* Part of the row, not a parallel column — otherwise labels
                    and values drift out of line as you scroll. */}
                <div
                  className={cn(
                    "border-ln2 text-ink2 sticky left-0 z-[2] box-border shrink-0 border-r py-[11px] pl-[18px] text-[13px] leading-[1.25]",
                    surface,
                  )}
                  style={{ flex: `0 0 ${LABEL_WIDTH}px` }}
                >
                  {row.label}
                </div>
                {places.map((h) => {
                  const c = row.cell(h);
                  return (
                    <div
                      key={h.hospital.id}
                      className="border-ln box-border shrink-0 border-l"
                      style={{ flex: `0 0 ${COLUMN_WIDTH}px` }}
                    >
                      <CompareCell
                        value={c.value}
                        note={c.note}
                        mono={c.mono}
                        fillHref={`/hospitals/${h.hospital.id}/edit`}
                        className="px-[9px]"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-[8px] px-[18px] py-[14px]">
        <Chip tone="outline">slide the table sideways ›</Chip>
        <Link href={showAll ? "/compare" : "/compare?rows=all"}>
          <Chip tone="outline">
            {showAll ? "fewer rows" : `${more.length} more rows`}
          </Chip>
        </Link>
      </div>

      <BottomBar>
        {decided ? (
          // The decision is made; the next real thing is the pack.
          <BarPrimary href="/papers">Papers for {leader.name}</BarPrimary>
        ) : leader ? (
          <form action={pickAction} className="flex-1">
            <input type="hidden" name="id" value={leader.id} />
            <BarPrimary type="submit">Pick {leader.name}</BarPrimary>
          </form>
        ) : (
          <BarPrimary href="/hospitals">Back to the places</BarPrimary>
        )}
        {leader && !decided && (
          <form action={ruleOutAction}>
            <input type="hidden" name="id" value={leader.id} />
            <BarSecondary type="submit" width={104}>
              Rule out
            </BarSecondary>
          </form>
        )}
      </BottomBar>
    </>
  );
}

function Header() {
  return (
    <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
      <div className="flex items-end gap-[12px]">
        <Link href="/hospitals" aria-label="Back" className="text-ink2 text-[20px] leading-none">
          ‹
        </Link>
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">Compare</h1>
      </div>
      <MoneyToggle />
    </header>
  );
}
