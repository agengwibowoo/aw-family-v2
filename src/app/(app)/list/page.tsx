import Link from "next/link";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState, NothingYet } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress";
import { Sheet } from "@/components/sheet";
import { ThingRow } from "@/components/thing-row";
import { bandRange, currentBand } from "@/domain/age";
import { formatDayMonth, todayInHousehold } from "@/domain/dates";
import { countOf } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin, listAgeBands } from "@/server/services/household";
import { bandProgress, countThings, listThings } from "@/server/services/things";

/**
 * S8 — The list.
 *
 * It never opens on five hundred things, so it never needs a filter bar. It
 * opens on the band you are in, which is about eleven rows — that is the whole
 * answer to "filters before answers", and the reason the header names the band
 * as context rather than offering it as a control.
 *
 * Three facts per row and nothing else: the name, `have of need` in mono, one
 * status word. Gift eligibility is a phrase in the meta line, not a badge
 * column. Search is a bottom-third primary action, not a magnifier in a top
 * corner she cannot reach.
 */
export default async function ListScreen({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; narrow?: string }>;
}) {
  await requireApproved("/list");
  const { band: bandParam, narrow } = await searchParams;

  const today = todayInHousehold();
  const [origin, bands] = await Promise.all([getOrigin(), listAgeBands()]);

  const chosen =
    bandParam !== undefined
      ? bands.find((b) => String(b.id) === bandParam)
      : origin
        ? currentBand(bands, origin, today)
        : bands[0];

  if (!chosen) {
    return (
      <main className="px-[18px] py-[20px]">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
          The list
        </h1>
        <div className="mt-[13px]">
          <Card>
            <EmptyState
              headline="No age bands yet."
              sub="The reference data has not been seeded."
            />
          </Card>
        </div>
      </main>
    );
  }

  const [rows, progress, total] = await Promise.all([
    listThings({ bandId: chosen.id }),
    bandProgress(chosen.id),
    countThings(),
  ]);

  const elsewhere = total - rows.length;
  // What the band is wanted by, derived from the origin — never stored, so it
  // is never wrong the day after the birth.
  const wantedBy = origin ? bandRange(chosen, origin).end : null;

  return (
    <>
      <main className="px-[18px] py-[20px]">
        <header className="mb-[13px]">
          {/* The band as context, not as a control. */}
          <p className="text-ink2 text-[13px]">
            {chosen.name}
            {wantedBy && ` · wanted by ${formatDayMonth(wantedBy)}`}
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            The list
          </h1>
        </header>

        {rows.length === 0 ? (
          <Card>
            <NothingYet what="list" href="/list/new" />
          </Card>
        ) : (
          <>
            <Card className="gap-[9px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15.5px] font-medium tracking-[-0.005em]">
                  <span className="tabular">{countOf(progress.got, progress.things)}</span>{" "}
                  got
                </span>
                <Link href="/list?narrow=1">
                  <Chip tone="outline">What age ›</Chip>
                </Link>
              </div>
              <ProgressBar have={progress.got} need={progress.things} />
            </Card>

            <Card className="mt-[13px] py-0">
              {rows.map((thing) => (
                <ThingRow
                  key={thing.id}
                  name={thing.name}
                  have={thing.have}
                  need={thing.need}
                  status={thing.status}
                  giftable={thing.giftable}
                  href={`/list/${thing.id}`}
                />
              ))}
            </Card>

            {elsewhere > 0 && (
              <Link
                href="/find"
                className="border-ln2 text-ink mt-[13px] flex min-h-[46px] items-center justify-center rounded-[11px] border border-dashed text-[14px] font-medium"
              >
                Show the other {elsewhere} things
              </Link>
            )}
          </>
        )}
      </main>

      {narrow === "1" && (
        <Sheet title="Narrow it">
          <NarrowChoices
            bands={bands.map((b) => ({ id: b.id, name: b.name }))}
            current={chosen.id}
          />
        </Sheet>
      )}

      <BottomBar>
        <BarPrimary href="/find">Find a thing</BarPrimary>
        <BarSecondary href="/list?narrow=1" width={126}>
          Narrow it
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/**
 * The one entry point, never a permanent bar.
 *
 * The destinations are places rather than predicates: an age, the things
 * family could give, everything, and the ones we don't need any more.
 */
function NarrowChoices({
  bands,
  current,
}: {
  bands: { id: number; name: string }[];
  current: number;
}) {
  const row =
    "border-ln flex min-h-[52px] items-center justify-between border-b text-[15.5px] last:border-b-0";

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {bands.map((b) => (
        <Link key={b.id} href={`/list?band=${b.id}`} className={row}>
          <span className={b.id === current ? "font-semibold" : "font-medium"}>
            {b.name}
          </span>
          {b.id === current && <Chip tone="quiet">Showing</Chip>}
        </Link>
      ))}
      <Link href="/registry" className={row}>
        <span className="font-medium">Things family could give</span>
        <span aria-hidden className="text-ink3">
          ›
        </span>
      </Link>
      <Link href="/find" className={row}>
        <span className="font-medium">Everything, all ages</span>
        <span aria-hidden className="text-ink3">
          ›
        </span>
      </Link>
      <Link href="/find?kept=1" className={row}>
        <span className="font-medium">Don&rsquo;t need any more</span>
        <span aria-hidden className="text-ink3">
          ›
        </span>
      </Link>
    </div>
  );
}
