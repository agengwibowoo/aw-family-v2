import Link from "next/link";

import { BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { PhotoSlot } from "@/components/photo-slot";
import { countOf, ITEM_STATUS_WORDS } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { listThings } from "@/server/services/things";

/**
 * S13 — Things family could give.
 *
 * Read-only, behind the same gate. There is no public link and no share token:
 * seeing this list means being let into the household.
 *
 * **No prices at all — not even behind the toggle.** That is why there is no
 * money toggle in the header: a control that reveals nothing is a button you
 * can only get wrong. It is also why this screen reads from the same service
 * as the list but renders none of the money the list has.
 *
 * Sorted by what is still needed, because that is the question a guest is
 * actually asking.
 */
export default async function Registry() {
  await requireApproved("/registry");

  const rows = await listThings({ giftableOnly: true });

  // Most still needed first. A thing they already have in plenty is the last
  // thing to suggest as a present.
  const sorted = [...rows].sort((a, b) => {
    const shortfall = (t: (typeof rows)[number]) => Math.max(0, t.need - t.have);
    return (
      shortfall(b) - shortfall(a) ||
      a.bandSortOrder - b.bandSortOrder ||
      a.name.localeCompare(b.name)
    );
  });

  return (
    <>
      <main className="px-[18px] py-[20px]">
        <header className="mb-[13px] flex items-end gap-[12px]">
          <Link href="/list" aria-label="Back" className="text-ink2 text-[20px] leading-none">
            ‹
          </Link>
          <div>
            <p className="text-ink2 tabular text-[13px]">
              {sorted.length} things · read only
            </p>
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              Things family could give
            </h1>
          </div>
        </header>

        <div className="border-ln mb-[13px] rounded-[14px] border border-dashed px-[16px] py-[15px]">
          <p className="text-ink2 text-[13px]">
            Only people you&rsquo;ve let in can see this. No prices, for anyone.
          </p>
        </div>

        {sorted.length === 0 ? (
          <Card>
            <EmptyState
              headline="Nothing on this list yet."
              sub="Mark a thing as one family could give and it appears here."
              action={{ label: "Find a thing", href: "/find" }}
            />
          </Card>
        ) : (
          <Card className="py-0">
            {sorted.map((thing) => (
              <div
                key={thing.id}
                className="border-ln flex items-center gap-[12px] border-b py-[12px] last:border-b-0"
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
                    {` · ${thing.categoryName}`}
                  </span>
                </span>
                <Chip tone={thing.status === "got_it" ? "solid" : "quiet"}>
                  {ITEM_STATUS_WORDS[thing.status]}
                </Chip>
              </div>
            ))}
          </Card>
        )}

        <p className="text-ink3 mt-[13px] text-[13px]">
          Sorted by what&rsquo;s still needed. No prices shown to anyone.
        </p>
      </main>

      <BottomBar>
        <BarSecondary href="/list" width={140}>
          Back to the list
        </BarSecondary>
      </BottomBar>
    </>
  );
}
