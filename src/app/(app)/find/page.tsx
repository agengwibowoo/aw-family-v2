import Link from "next/link";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { NothingMatches } from "@/components/empty-state";
import { PhotoSlot } from "@/components/photo-slot";
import { bandRange, currentBand } from "@/domain/age";
import { formatDayMonth, todayInHousehold } from "@/domain/dates";
import { matchCountLine } from "@/domain/search";
import { countOf, ITEM_STATUS_WORDS } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin, listAgeBands } from "@/server/services/household";
import { countThings, listThings, searchThings } from "@/server/services/things";

/**
 * Finding a thing, and the way to everything else.
 *
 * An empty query is not a blank screen — it is the jump-to list, which is also
 * where "show the other 106 things" lands. A wall of five hundred rows is
 * never the answer to either question.
 *
 * Photos appear here and not on the list, because here she is identifying and
 * there she is scanning.
 */
export default async function Find({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kept?: string }>;
}) {
  await requireApproved("/find");
  const { q, kept } = await searchParams;
  const query = q?.trim() ?? "";

  if (kept === "1") return <Kept />;

  const results = query === "" ? [] : await searchThings(query);

  return (
    <>
      <main className="px-[18px] py-[20px]">
        <header className="mb-[13px]">
          <p className="text-ink2 text-[13px]">
            Type any part of a name, in English or Indonesian.
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Find a thing
          </h1>
        </header>

        <form action="/find">
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="botol, popok, bottle…"
            aria-label="What are you looking for?"
            className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px] placeholder:text-ink3"
          />
        </form>

        {query === "" ? (
          <div className="mt-[20px]">
            <JumpTo />
          </div>
        ) : results.length === 0 ? (
          <Card className="mt-[13px]">
            {/* Always offers the way onward. */}
            <NothingMatches
              query={query}
              href={`/list/new?name=${encodeURIComponent(query)}`}
            />
          </Card>
        ) : (
          <>
            <p className="text-ink2 mt-[16px] text-[13px]">
              {matchCountLine(results.length, query)}
            </p>
            <Card className="mt-[9px] py-0">
              {results.map((thing) => (
                <Link
                  key={thing.id}
                  href={`/list/${thing.id}`}
                  className="border-ln flex min-h-[52px] items-center gap-[12px] border-b py-[12px] last:border-b-0"
                >
                  <PhotoSlot size="row" src={thing.imagePath} />
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="text-[15.5px] font-medium tracking-[-0.005em]">
                      {thing.name}
                    </span>
                    <span className="text-ink2 text-[13px]">
                      <span className="tabular">
                        {countOf(thing.have, thing.need)}
                      </span>
                      {` · ${thing.bandName}`}
                    </span>
                  </span>
                  <Chip tone={thing.status === "got_it" ? "solid" : "quiet"}>
                    {ITEM_STATUS_WORDS[thing.status]}
                  </Chip>
                </Link>
              ))}
            </Card>
          </>
        )}
      </main>

      <BottomBar>
        <BarPrimary href="/list/new">Add a thing</BarPrimary>
        <BarSecondary href="/list" width={126}>
          Back to the list
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/** Places, not predicates. */
async function JumpTo() {
  const today = todayInHousehold();
  const [origin, bands] = await Promise.all([getOrigin(), listAgeBands()]);
  const now = origin ? currentBand(bands, origin, today) : undefined;
  const giftable = await listThings({ giftableOnly: true });
  const archived = await countThings({ archived: true });

  const row =
    "border-ln flex min-h-[52px] items-center justify-between border-b py-[12px] last:border-b-0";

  return (
    <Card className="py-0">
      {now && (
        <Link href={`/list?band=${now.id}`} className={row}>
          <span className="flex flex-col gap-[2px]">
            <span className="text-[15.5px] font-medium">{now.name}</span>
            {origin && (
              <span className="text-ink2 text-[13px]">
                wanted by {formatDayMonth(bandRange(now, origin).end ?? today)}
              </span>
            )}
          </span>
          <span aria-hidden className="text-ink3">
            ›
          </span>
        </Link>
      )}
      <Link href="/registry" className={row}>
        <span className="flex flex-col gap-[2px]">
          <span className="text-[15.5px] font-medium">
            Things family could give
          </span>
          <span className="text-ink2 tabular text-[13px]">
            {giftable.length} things
          </span>
        </span>
        <span aria-hidden className="text-ink3">
          ›
        </span>
      </Link>
      {bands.map((b) => (
        <Link key={b.id} href={`/list?band=${b.id}`} className={row}>
          <span className="text-[15.5px] font-medium">{b.name}</span>
          <span aria-hidden className="text-ink3">
            ›
          </span>
        </Link>
      ))}
      {archived > 0 && (
        <Link href="/find?kept=1" className={row}>
          <span className="flex flex-col gap-[2px]">
            <span className="text-[15.5px] font-medium">
              Don&rsquo;t need any more
            </span>
            <span className="text-ink2 tabular text-[13px]">
              {archived} things, kept for later
            </span>
          </span>
          <span aria-hidden className="text-ink3">
            ›
          </span>
        </Link>
      )}
    </Card>
  );
}

/** Kept, never deleted. Their history, prices and links are all still here. */
async function Kept() {
  const rows = await listThings({ archivedOnly: true });

  return (
    <>
      <main className="px-[18px] py-[20px]">
        <header className="mb-[13px]">
          <p className="text-ink2 tabular text-[13px]">
            {rows.length} things, kept for later
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Don&rsquo;t need any more
          </h1>
        </header>

        <p className="text-ink2 mb-[13px] text-[13px]">
          Nothing here is deleted. What was spent and what was found is all
          still on each one.
        </p>

        <Card className="py-0">
          {rows.map((thing) => (
            <Link
              key={thing.id}
              href={`/list/${thing.id}`}
              className="border-ln flex min-h-[52px] items-center justify-between gap-3 border-b py-[12px] last:border-b-0"
            >
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-[15.5px] font-medium">{thing.name}</span>
                <span className="text-ink2 text-[13px]">{thing.bandName}</span>
              </span>
              <Chip tone="outline">Kept</Chip>
            </Link>
          ))}
        </Card>
      </main>

      <BottomBar>
        <BarPrimary href="/find">Find a thing</BarPrimary>
        <BarSecondary href="/list" width={126}>
          Back to the list
        </BarSecondary>
      </BottomBar>
    </>
  );
}
