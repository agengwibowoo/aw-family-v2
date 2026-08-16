import Link from "next/link";

import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Money, MoneyToggle } from "@/components/money";
import { ProgressBar } from "@/components/progress";
import { countdownLine, currentBand } from "@/domain/age";
import { formatWeekdayDayMonth, todayInHousehold } from "@/domain/dates";
import { countOf } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin, listAgeBands } from "@/server/services/household";
import { hospitalCounts } from "@/server/services/hospitals";
import { listMembers } from "@/server/services/members";
import { moneyScreen, type Rollup } from "@/server/services/money";
import { listThings } from "@/server/services/things";

/**
 * S12 — Money.
 *
 * The same four tabs as her account; only the landing tab differs. This is
 * his density, and it is the one screen where the amounts are the point.
 *
 * Percentages scope to the current band by default — "38% of everything you
 * will ever buy" is not a number anybody can act on — with an explicit way out
 * to all-time rather than a control that can be left in the wrong position.
 *
 * Every bar measures things rather than rupiah, so the whole screen still
 * works with money hidden.
 */
export default async function MoneyScreen({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; all?: string }>;
}) {
  await requireApproved("/money");
  const { band: bandParam, all } = await searchParams;

  const today = todayInHousehold();
  const [origin, bands] = await Promise.all([getOrigin(), listAgeBands()]);

  const showAll = all === "1";
  const chosen = showAll
    ? undefined
    : bandParam !== undefined
      ? bands.find((b) => String(b.id) === bandParam)
      : origin
        ? currentBand(bands, origin, today)
        : bands[0];

  const [data, giftable, hospitals, members] = await Promise.all([
    moneyScreen(chosen?.id),
    listThings({ giftableOnly: true }),
    hospitalCounts(),
    listMembers(),
  ]);

  const scope = showAll
    ? data.everything
    : (data.bands.find((b) => b.id === chosen?.id)?.rollup ?? data.everything);

  if (data.everything.things === 0) {
    return (
      <main className="px-[18px] py-[20px]">
        <Header today={today} origin={origin} />
        <Card>
          <EmptyState
            headline="Nothing has been spent yet."
            sub="Once there are things on the list, what they cost adds up here."
            action={{ label: "Add a thing", href: "/list/new" }}
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="px-[18px] py-[20px]">
      <Header today={today} origin={origin} />

      <Stack>
        <Card className="gap-[9px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15.5px] font-medium tracking-[-0.005em]">
              {showAll ? "Everything, all ages" : (chosen?.name ?? "Everything")}
            </span>
            <Link href={showAll ? "/money" : "/money?all=1"}>
              <Chip tone="outline">
                {showAll
                  ? "Just this age ›"
                  : `All ${data.everything.things} things ›`}
              </Chip>
            </Link>
          </div>
          <ProgressBar have={scope.got} need={scope.things} />
          <p className="tabular text-ink2 text-[13px]">
            {countOf(scope.got, scope.things)} got
          </p>

          <div className="border-ln mt-[4px] border-t">
            <Amount label="Spent" value={scope.spent} />
            <Amount
              label="Still to come, roughly"
              value={scope.stillToCome}
              // Some outstanding things have no price anywhere, so the total is
              // a floor rather than an estimate. Say so instead of implying it.
              note={
                scope.partial
                  ? "Some of what's left has no price written down"
                  : undefined
              }
            />
          </div>
        </Card>

        <section>
          <div className="mb-[9px]">
            <SectionLabel>By sort of thing</SectionLabel>
          </div>
          <Card className="py-0">
            {data.byCategory.map((c) => (
              <Breakdown key={c.id} name={c.name} rollup={c.rollup} />
            ))}
          </Card>
        </section>

        <section>
          <div className="mb-[9px]">
            <SectionLabel>How important</SectionLabel>
          </div>
          <Card className="py-0">
            {data.byPriority.map((p) => (
              <div
                key={p.id}
                className="border-ln flex items-center justify-between gap-3 border-b py-[12px] last:border-b-0"
              >
                <span className="text-[15.5px] font-medium">{p.name}</span>
                <span className="tabular text-ink2 text-[13px]">
                  {countOf(p.rollup.got, p.rollup.things)} got
                </span>
              </div>
            ))}
          </Card>
        </section>

        <Card className="py-0">
          <Out
            href="/hospitals"
            label="Where to give birth"
            meta={hospitalLine(hospitals)}
          />
          <Out
            href="/registry"
            label="Things family could give"
            meta={`${giftable.length} things`}
          />
          <Out
            href="/papers"
            label="Papers for the hospital"
            meta="What to bring on the day"
          />
          <Out
            href="/insurance"
            label="Your insurance"
            meta="The policy and what it pays"
          />
          <Out
            href="/who"
            label="Who can get in"
            meta={`${members.household.length} in the household${
              members.waiting.length > 0
                ? ` · ${members.waiting.length} waiting`
                : ""
            }`}
          />
        </Card>
      </Stack>
    </main>
  );
}

function Header({
  today,
  origin,
}: {
  today: string;
  origin: { dueDate: string; birthDate: string | null } | null;
}) {
  return (
    <header className="mb-[13px] flex items-end justify-between gap-3">
      <div>
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
          Money
        </h1>
      </div>
      <MoneyToggle />
    </header>
  );
}

function Amount({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="border-ln flex items-baseline justify-between gap-4 border-b py-[10px] last:border-b-0">
      <span className="text-ink2 text-[14.5px]">{label}</span>
      <span className="flex flex-col items-end gap-[2px] text-right">
        <span className="text-[14.5px] font-medium">
          <Money amount={value} />
        </span>
        {note && <span className="text-ink3 text-[12px]">{note}</span>}
      </span>
    </div>
  );
}

/** The bar measures things, so it survives money being hidden. */
function Breakdown({ name, rollup }: { name: string; rollup: Rollup }) {
  return (
    <div className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-medium">{name}</span>
        <span className="mt-[5px] block">
          <ProgressBar have={rollup.got} need={rollup.things} className="h-[5px]" />
        </span>
        <span className="tabular text-ink2 mt-[4px] block text-[12px]">
          {countOf(rollup.got, rollup.things)}
        </span>
      </span>
      <span className="text-ink2 shrink-0 basis-[80px] text-right text-[13px]">
        <Money amount={rollup.spent} />
      </span>
    </div>
  );
}

function Out({
  href,
  label,
  meta,
}: {
  href: string;
  label: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="border-ln flex min-h-[52px] items-center justify-between gap-3 border-b py-[12px] last:border-b-0"
    >
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[15.5px] font-medium">{label}</span>
        <span className="text-ink2 text-[13px]">{meta}</span>
      </span>
      <span aria-hidden className="text-ink3">
        ›
      </span>
    </Link>
  );
}

function hospitalLine(counts: Partial<Record<string, number>>): string {
  const total =
    (counts.picked ?? 0) + (counts.shortlisted ?? 0) + (counts.ruled_out ?? 0);
  if (total === 0) return "None added yet";
  return counts.picked
    ? `${total} places · one picked`
    : `${total} places · none picked yet`;
}
